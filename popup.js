$(document).on("submit", "#scan_wallet_form", (e) => {
  e.preventDefault();
  $("#submit_btn_div").html(
    `<button class="btn btn-primary btn-block" type="submit" disabled><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Scanning...</button>`
  );
  $("#status").text('');
  $("#report_btn_div").html('');
  drawGuage(0);

  let APIKEY = "API KEY";
  let endpoint = "https://api.etherscan.io/api";
  let walletAddress = $("#walletAddress").val();
  fetch(
    `${endpoint}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&page=1&offset=1000&sort=desc&apikey=${APIKEY}`
  )
    .then((res) => res.json())
    .then((resp) => {
      if (resp.status == "1") {
        let result = resp.result;
        // let totalTrans = result.length;
        // $("#totalTransaction").text(`Total Transactions : ${totalTrans}`);
        $("#ai-label").text("Safe");
        const functionNameCount = {};
        result.forEach((transaction) => {
          const functionName = transaction.functionName;

          // If the functionName is not in the object, initialize count to 1, otherwise increment the count
          functionNameCount[functionName] =
            (functionNameCount[functionName] || 0) + 1;
        });
        const functionNameCountArray = Object.entries(functionNameCount).map(
          ([functionName, count]) => ({
            functionName: functionName.split("(")[0],
            count,
          })
        );

        let functionNamesToKeep = [
          "swapExactTokensForETHSupportingFeeOnTransferTokens",
          "approve",
          "swapExactETHForTokensSupportingFeeOnTransferTokens",
          "transfer",
          "swapETHForExactTokens",
          "mint",
        ];

        let inputArr = functionNameCountArray.filter((obj) =>
          functionNamesToKeep.includes(obj.functionName)
        );

        let walletScore = 100 - calculateWalletScore(functionNameCountArray)
        generateReport(inputArr,walletScore );
        $("#status").text(`The wallet's Guardian AI score is ${walletScore}%. To get a detailed explanation, please download the report provided below.`)
        drawGuage(walletScore);
        $("#report_btn_div").html(
          `<button class="btn btn-primary btn-block" type="submit" disabled><span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading Full Report</button>`
        );
      }
    })
    .finally(() => {
      $("#submit_btn_div").html(
        `<button data-mdb-ripple-init type="submit" class="btn btn-block text-white" style="background-color: #3c91ff;">Scan Wallet</button>`
      );
    });
});

function calculateWalletScore(inputArr) {
  let walletScore = 0;
  inputArr.forEach(item => {
    if(item.functionName == "claim" || item.functionName == "claimToken" || item.functionName == "mint") {
      walletScore += item.count*10;
    }
  })
  return walletScore;

}
function generateReport(inputArr, score) {
  const apiKey = "APIKEY"// Replace with your actual OpenAI API key
  const apiUrl =
    "https://api.openai.com/v1/engines/gpt-3.5-turbo-instruct/completions";
  const prompt = `please write a full detailed core score report for wallet scanner, score must be ${score}/100, the wallet is crypto wallet, the input data is : ${JSON.stringify(
    inputArr
  )}`;
  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt: prompt,
      max_tokens: 1000,
      n: 1,
      temperature: 0.7,
    }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      let report = data.choices[0].text.trim();
      $("#report_btn_div").html(
        `<button id="download_report_btn" data-report="" class="btn btn-primary btn-block">Download Report</button>`
      );
      $("#download_report_btn").attr("data-report", window.btoa(report));
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });
}

$(document).on("click", "#download_report_btn", (e) => {
  let data = window.atob($("#download_report_btn").attr("data-report"));
  saveTextAsFile(data, "report.txt");
});

function saveTextAsFile(textToSave, fileName) {
  // Create a Blob with the text content
  const blob = new Blob([textToSave], { type: "text/plain" });

  // Create a temporary URL for the Blob
  const url = URL.createObjectURL(blob);

  // Create a link element
  const link = document.createElement("a");

  // Set the link's attributes
  link.href = url;
  link.download = fileName;

  // Append the link to the document
  document.body.appendChild(link);

  // Trigger a click on the link to initiate the download
  link.click();

  // Remove the link from the document
  document.body.removeChild(link);

  // Revoke the Blob URL to free up resources
  URL.revokeObjectURL(url);
}

function drawGuage(value) {
  var opts = {
    angle: 0, // The span of the gauge arc
    lineWidth: 0.2, // The line thickness
    radiusScale: 1, // Relative radius
    pointer: {
      length: 0.5, // // Relative to gauge radius
      strokeWidth: 0.06, // The thickness
      color: "#3c91ff", // Fill color
    },
    limitMax: false, // If false, max value increases automatically if value > maxValue
    limitMin: false, // If true, the min value of the gauge will be fixed
    colorStart: "#6F6EA0", // Colors
    colorStop: "#008000", // just experiment with them
    strokeColor: "#EEEEEE", // to see which ones work best for you
    percentColors: [[0.5, "#FF0000" ], [0.70, "#FFA500"], [0.90, "#FFFF00"], [1.00, "#008000"]]
  };
  var target = document.getElementById("myCanvas"); // your canvas element
  var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
  gauge.maxValue = 100; // set max gauge value
  gauge.setMinValue(0); // set min value
  gauge.set(value); // set actual value
}
