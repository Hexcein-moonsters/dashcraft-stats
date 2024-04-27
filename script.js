let authorizationElement = document.getElementById("authorization")
let usernameElement = document.getElementById("username")
authorizationElement.value = localStorage.getItem("authorization") || ""
usernameElement.value = localStorage.getItem("username") || "";
let normalAccount = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWM0NmMzNGExYmEyMjQyNGYyZTAwMzIiLCJpbnRlbnQiOiJvQXV0aCIsImlhdCI6MTcwNzM3MTU3Mn0.0JVw6gJhs4R7bQGjr8cKGLE7CLAGvyuMiee7yvpsrWg'
let accountData;
let progress = 0
addEventListener("DOMContentLoaded", (event) => {
  if (authorizationElement.value !== "" && usernameElement.value !== "") {
    alert("Both a username and a token are set. Please only set one.")
  }
});

const points = []

async function getMyAccountData(authorization) {
  const response = await fetch("https://api.dashcraft.io/auth/account", {
    "headers": {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.9,nl;q=0.8",
      "authorization": authorization,
      "cache-control": "no-cache",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site"
    },
    "referrer": "https://dashcraft.io/",
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  });
  let data = await response.json()
  return data
}

function getLB(ID, authorization) {
  fetch("https://api.dashcraft.io/trackv2/" + ID + "?supportsLaps1=true", {
    headers: {
      'Authorization': authorization
    }
  })
    .then((response) => response.json())
    .then((json) => countPoints(json));
}
function getPersonalTime(ID, authorization, mapper, version) {
  fetch("https://api.dashcraft.io/trackv2/" + ID + "/leaderboard", {
    headers: {
      'Authorization': authorization
    }
  })
    .then((response) => response.json())
    .then((json) => countPersonalPoints(json, ID, mapper, version));
}
function countPoints(data) {
  var lb = data.leaderboard
  if (lb.find(isUser)) {
    points.push({ track: "https://dashcraft.io?t=" + data._id, mapper: data.user.username, time: lb.find(isUser).time, position: lb.findIndex(isUser) + 1 })
    progress++
  } else {
    console.log("https://dashcraft.io?t=" + data._id + " is not finished")
    progress++
  }
}

function countPersonalPoints(data, ID, mapper, version) {
  const myBest = data.myBest
  let myTime, myPlace;
  if (myBest) {
    myPlace = myBest.place
    myTime = myBest.time
  }
  if (myTime) {
    points.push({ track: "https://dashcraft.io?t=" + ID, trackID: ID, mapper: mapper, time: myTime, position: myPlace + 1, version: version })
    progress++
  } else {
    console.log("https://dashcraft.io?t=" + ID + " is not finished")
    progress++ // still add up progress, even if it's not finished
  }
}

function isUser(run) {
  return run.user.username === usernameElement.value; // did the user ask for that username?
}
function isMe(run) {
  return run.user.username === accountData.username; // did the user ask for that username?
}

function retrieveMaps() {
  document.getElementById("summaryButton").disabled = true;
  document.getElementById("summaryButton").classList.add("disabled");
  const div = document.createElement("div");
  div.id = "loading"
  div.appendChild(document.createTextNode("Loading..."));
  document.body.appendChild(div);
  if (document.getElementById("points")) {
    document.getElementById("points").remove()
  }
  var fetches = [];
  for (let i = 0; i < 20; i++) { // currently supports 1000 verified tracks.
    fetches.push(
      fetch("https://api.dashcraft.io/trackv2/verified2?page=" + i + "&pageSize=50")
        .then((response) => response.json())
        .then((json) => {
          let json1 = json.tracks;
          let IDarr = [];
          for (let a = 0; a < json1.length; a++) {
            IDarr.push({ trackId: json1[a]._id, mapper: json1[a].user.username, version: json1[a].version });
          }
          return IDarr;
        }));

  }

  Promise.all(fetches)
    .then(async (IDL) => {
      IDarr = [];
      for (let a = 0; a < IDL.length; a++) {
        for (let b = 0; b < IDL[a].length; b++) {
          IDarr.push(IDL[a][b]);
        }
      }
      let authorization = authorizationElement.value
      if (authorization == undefined || authorization == "") { // blank, so use standard account.
        authorization = normalAccount
      }
      if (authorization !== normalAccount) { // personal token
        accountData = await getMyAccountData(authorization)
        console.log(accountData)
      }
      for (let i = 0; i < IDarr.length; i++) {
        if (authorization == normalAccount) {
          getLB(IDarr[i].trackId, authorization);
        } else { // personal token
          getPersonalTime(IDarr[i].trackId, authorization, IDarr[i].mapper, IDarr[i].version)
        }
      }
      function checkValues() {
        if (progress === IDarr.length) {
          clearInterval(checkInterval);
          addPointsHtml()
        }
      }
      const checkInterval = setInterval(checkValues, 1);

      function addPointsHtml() {
        document.getElementById("loading").remove();
        document.getElementById("summaryButton").disabled = false; document.getElementById("summaryButton").classList.remove("disabled");
        const newDiv = document.createElement("div");
        newDiv.id = "points";

        points.sort((a, b) => a.position - b.position);
        newDiv.appendChild(document.createTextNode("Average Position: " + average(points)));
        newDiv.appendChild(document.createElement("br"))
        newDiv.appendChild(document.createTextNode("Total Known Time: " + total(points)));
        newDiv.appendChild(document.createElement("br"))
        newDiv.appendChild(document.createElement("br"))
        for (let i = 0; i < points.length; i++) {
          track = document.createElement("a")
          track.innerHTML = "<p><a href='" + points[i].track + "'>" + points[i].track + "</a> by " + points[i].mapper + "</p>"
          newDiv.appendChild(track);
          list = document.createElement("ul")
          if (points[i].position == "outOfRange") {
            list.innerHTML = "<li>Time: " + points[i].time + "</li>" + "<li>Position: Unknown. Not in leaderboard.</li>"
          } else {
            list.innerHTML = "<li>Time: " + points[i].time + "</li>" + "<li>Position: " + points[i].position + "</li>"
          }
          newDiv.appendChild(list)
          var img = new Image();
          const trackID = points[i].trackID;
          const version = points[i].version
          img.src = `https://cdn.dashcraft.io/v2/prod/track-thumbnail/lg/${trackID}.jpg?v=${version}`;
          var desiredHeight = 250;
          var aspectRatio = 1080 / 1920;
          var desiredWidth = Math.round(desiredHeight / aspectRatio);
          img.height = desiredHeight;
          img.width = desiredWidth;
          newDiv.appendChild(img);
          newDiv.appendChild(document.createElement("hr"))
        }
        newDiv.appendChild(document.createElement("br"))
        document.body.insertBefore(newDiv, document.getElementById("div1"));
      }
    });

}
function average(array) {
  var average = 0;
  var length = array.length
  for (let i = 0; i < array.length; i++) {
    if (array[i].position == "outOfRange") {
      // the user was not in the top ten,
      // so don't add anything to the average.
      length--
      // make sure not to influence the average calculation.
    }
    average += array[i].position
  }
  if (length == 0) {
    // the user was *never* in the top ten...
    return "Sorry, you never appeared in the leaderboard.";
  }
  return average / length;
}

function total(array) {
  var total = 0;
  for (let i = 0; i < array.length; i++) {
    total += array[i].time
  }
  return total;
}


