const request = require('request');
const express = require('express');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const hbs = require('hbs');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer')
const chalk = require('chalk')

var transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD
  }
})

var cryptPassword = "";

var index = -1
var pureIndex = 0
var newDest = ""
var userVerify = "false"

app.use(express.static('public/images')); 
app.set('view engine', 'hbs')
app.set('views', 'public/views')

io.on('connection', (socket) => {
  socket.on('request-dest-data', () => {
    var dataBuffer = fs.readFileSync('public/destinations/destinationList.json')
    var parsedData = JSON.parse(dataBuffer)
    socket.emit('dest-req-return', (parsedData))
  })
  socket.on('request-destination-load', (username) => {
    var dataBuffer = fs.readFileSync('public/userinfo/users/' + username + '.json')
    var data = JSON.parse(dataBuffer)
    data.forEach((term) => {
      if (term.flightName) {
        if (term.checkedIn == "true") {
          socket.emit('return-destination-load', term, "true")
        } else {
          socket.emit('return-destination-load', term, "false")
        }
      }
    })
  })
  socket.on('verify-auth', (username, password) => {
    const dataBuffer = fs.readFileSync('public/userinfo/userInfo.json')
    const parsedData = JSON.parse(dataBuffer)
    var every = 0
    parsedData.forEach((data) => {
      every++
      if (data.username == username) {
        request({ url: "https://api.hashify.net/hash/sha3-512/hex?value=" + password, json: true }, (error, response) => {
          console.log(data.password, response.body.Digest)
          if (data.password == response.body.Digest) {
            socket.emit('login-grant', data.username, data.email)
            return
          } else {
            if (every == parsedData.length){
              console.log('passfail')
              socket.emit('login-password-fail')
            } else {

            }
          }
        })
      } else {
        if (every == parsedData.length){
          console.log(every, parsedData.length)
          socket.emit('login-username-fail')
        }
      }
    })
    console.log('this socket')
  })
  socket.on('login-state', (state) => {
    console.log(state)
    if (state == "true") {
      userVerify = "true"
    } else {
      userVerify = "false"
    }
  })
})

app.get('/save-flights', (req, res) => {
  var dataBuffer = fs.readFileSync('public/userinfo/users/' + req.query.username + '.json')
  var data = JSON.parse(dataBuffer)
  data.push({
    flightName: req.query.name,
    flightDate: req.query.date,
    flightType: req.query.type, 
    flightShort: req.query.short,
    checkedIn: "false"
  })
  var bufferData = JSON.stringify(data)
  fs.writeFileSync('public/userinfo/users/' + req.query.username + '.json', bufferData)
  var sendValue = "<script>window.location = '/my-flights?short=" + req.query.short + "'</script>"
  console.log(sendValue)
  transport.sendMail({to: req.query.email, from: 'Ace Airlines <aceairlineofficial@gmail.com', subject: 'Your booked a flight!', html: "<html><head><link href='https://fonts.googleapis.com/css2?family=Roboto&display=swap' rel='stylesheet'></head><body style='padding: 40px; background-color: #f1f1f1;'><center><div style='width: 400px; height: 750px; background-color: white; border: 1px solid; text-align: left;'><center><img src='http://node-for-ace-app-beta.benjaminlamber1.repl.co/acelogo.png' style='width: 100px; margin-top: 20px;'></center><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Hello " + req.query.username + ",</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you for booking a flight with us! Here are the details:</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Flight Location: " + req.query.name + "</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Flight Departure Date: " + req.query.date + "</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Flight Type: " + req.query.type + "</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you for booking a flight with us! We hope it is satisfactory! If not, please let a representative know.</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px; margin-bottom: 10px;'>Thank you,</p><p style='margin: 20px; font-family: roboto; margin-top: 0px; font-size: 20px;'>Ace Airlines</p></div></center></body></html>"}, (err, response) => {
    if (err) throw err
    console.log('Email sent.')
  })
  res.send(sendValue)
})

app.get('/sign-up', (req, res) => {
  res.render('sign-up.hbs')
})

app.get('/book-a-flight', (req, res) => {
  res.render('bookFlight.hbs')
})

app.get('/home', (req, res) => {
  res.render('home.hbs')
})

app.get('/news', (req, res) => {
  res.render('ace-news.hbs')
})

app.get('/delete-flights', (req, res) => {
  var data = JSON.parse(fs.readFileSync("public/userinfo/users/" + req.query.username + ".json"))
  var empty = []
  empty.push({
    username: req.query.username
  })
  fs.writeFileSync("public/userinfo/users/" + req.query.username + ".json", JSON.stringify(empty))
  res.send("<script>window.location = '/my-flights'</script>")

}) 

app.get('/confirm-check-in', (req, res) => {
  res.render('ConfirmCheckIn.hbs')
})

app.get('/check-in', (req, res) => {
  var indexData = -1
  var checkInName = req.query.name
  console.log(checkInName)
  var checkInUsername = req.query.username
  var flightDate = req.query.date
  console.log(flightDate)
  var flightType = req.query.type
  console.log(flightType)
  var dataBuffer = fs.readFileSync('public/userinfo/users/' + checkInUsername + '.json')
  var data = JSON.parse(dataBuffer)
  data.forEach((info) => {
    indexData = indexData + 1
    if (info.flightName == checkInName) {
      var name = info.flightName
      var date = info.flightDate
      var type = info.flightType
      var short = info.flightShort
      console.log(data)
      console.log(indexData)
      data.splice(indexData, 1)
      data.push({
        flightName: name,
        flightDate: date,
        flightType: type,
        flightShort: short,
        checkedIn: "true"
      })
      var stringNewData = JSON.stringify(data)
      fs.writeFileSync('public/userinfo/users/' + checkInUsername + '.json', stringNewData)
      res.render('check-in.hbs', {
        flightName: req.query.name,
        flightDate: req.query.date,
        flightType: req.query.type,
        flightShort: req.query.short
      })
    } else {
      
    }
  })
})

app.get('/flightStatus', (req, res) => {
  console.log('\n\nFlight Status\n\n')
  console.log(req.query.name)
  var months = ["", "January", "Feburary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  var name = req.query.name
  var capsName = name.toUpperCase()
  var orginDate = req.query.date
  var dateVanilla = orginDate.slice(0, 10)
  var year = dateVanilla.slice(0, 4)
  var monthVanilla = Number(dateVanilla.slice(5, 7))
  var month = months[monthVanilla]
  var day = dateVanilla.slice(8, 10)
  var date = month + " " + day + ", " + year
  var type = req.query.type
  var flightshort = ""
  var data = JSON.parse(fs.readFileSync('public/userinfo/users/' + req.query.username + ".json"))
  console.log(data)
  data.forEach((index) => {
    console.log(index.flightName, req.query.name)
    if (index.flightName == req.query.name) {
      console.log(index.flightName)
      console.log(index.flightShort + ": DATA")
      flightshort = index.flightShort
      console.log(flightshort)
      var arrShort = flightshort.slice(4, 7)
      res.render('flightStatus.hbs', {
        name,
        date,
        type,
        arrival: arrShort
      })
    }
  })
})

// Do not mess with the '/connect' endpoint. This data connects directly to the internal filesystem. Misusing the enpoint could resolve in destructive data for other applications. Thank you!!! :)

app.get('/connect', (req, res) => {
  if (req.query.query === 'get-destinations') {
    res.sendFile(path.join(__dirname + '/public/destinations/destinationList.json'))
  } else if (req.query.query === 'add-destinations') {
      var data = req.query.data
      fs.writeFileSync('public/destinations/destinationList.json', data)
      res.send({
        status: "success"
      })
  } else if (req.query.query === 'getUsers') {
    var userCount = JSON.parse(fs.readFileSync('public/userinfo/userInfo.json'))
    var count = userCount.length
    res.send({
      count: count.toString()
    })
  } else if (req.query.query === 'get-ind-flight-data') {
    var data = JSON.parse(fs.readFileSync('public/userinfo/users/' + req.query.user + ".json"))
    res.send(data)

  } else if (req.query.query === 'grabUsers') {
    var data = JSON.parse(fs.readFileSync('public/userinfo/userInfo.json'))
    data.push({
      status: 'success'
    })
    res.send(data)
    console.log(data)
  } else if (req.query.query === 'grab-ind-data') {
    var destData = JSON.parse(fs.readFileSync('public/destinations/destinationList.json'))
    destData.forEach((index) => {
      if (index.name == req.query.data) {
        res.send(index.event)
      }
    })
  } else {
    res.send({
      status: "failure"
    })
  }
})

// End of '/connect endpoint. Thanks for not messing with it!! :)

app.get('/my-flights', (req, res) => {
  var name = req.query.name
  var date = req.query.date
  var type = req.query.flightType
  console.log(req.query.short)
  res.render('my-flights.hbs', {
    name,
    date,
    flightType: type,
    short: req.query.short
  })
})

app.get('/help', (req, res) => {
  res.render('help.hbs')
})

app.get('/radar', (req, res) => {
  res.render('flightRadar.hbs')
})

app.get('/confirm-book', (req, res) => {
  var name = req.query.name
  var date = req.query.date
  var type = req.query.type
  console.log(req.query.short)
  var short = req.query.short
  console.log(name, date, type, short)
  res.render('ConfimBook.hbs', {
    flightShort: short,
    flightName: name,
    flightData: date,
    flightType: type
  })
})

app.get('/create-account', (req, res) => {
  var count = 0;
  const dataBuffer = fs.readFileSync('public/userinfo/userInfo.json')
  const usersDataBuffer = fs.readFileSync('public/userinfo/users.json')
  const data = JSON.parse(dataBuffer)
  const usersData = JSON.parse(usersDataBuffer)
  const username = req.query.username
  usersData.forEach((userdata) => {
    if (userdata.username == req.query.username) {
      io.emit('bad-username')
    } else {
      count++
      if (count == usersData.length) {
        request({url: "https://api.hashify.net/hash/sha3-512/hex?value=" + req.query.password, json: true}, (error, response) => {
          cryptPassword = response.body.Digest
          data.push({
            email: req.query.email,
            username: req.query.username,
            password: cryptPassword
          })
          usersData.push({
            username: req.query.username
          })
          var placeData = []
          placeData.push({
            username: req.query.username
          })
          console.log(req.query.email)
          const userStorage = JSON.stringify(placeData)
          const fsData = JSON.stringify(data)
          console.log(fsData, username)
          const usersFsData = JSON.stringify(usersData)
          fs.writeFileSync('public/userinfo/users.json', usersFsData)
          fs.writeFileSync('public/userinfo/userInfo.json', fsData)
          fs.writeFileSync('public/userinfo/users/' + req.query.username + '.json', userStorage)
          var userDetails = req.query.username
          transport.sendMail({to: req.query.email, from: 'Ace Airlines <aceairofficial@gmail.com>',subject: 'Thanks for signing up for the Ace App!', html: "<html><head><link href='https://fonts.googleapis.com/css2?family=Roboto&display=swap' rel='stylesheet'></head><body style='padding: 40px; background-color: #f1f1f1;'><center><div style='width: 400px; height: 650px; background-color: white; border: 1px solid; text-align: left;'><center><img src='http://node-for-ace-app-beta.benjaminlamber1.repl.co/acelogo.png' style='width: 100px; margin-top: 20px;'></center><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Hello " + req.query.username + ",</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you for creating an account with Ace Airlines! If at any time you need help from a service representative, please contact us at aceairofficial@gmail.com</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>If you experience any bugs, then please report them to our forum. https://flyaceairline.weebly.com/ace-app/welcome-to-the-ace-app-beta-forums#comments</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you,</p><p style='margin-left: 20px; font-family: roboto; margin-top: 0px; font-size: 20px;'>Ace Airlines</p></div></center></body></html>"}, (err, response) => {
            if (err) throw err
            console.log('Email sent.')
            res.redirect('/')
          })
        })
      }
    }
  })
})

app.get('/', (req, res) => {
  res.render('index.hbs')
})

app.get('/sign-up/auth', (req, res) => {
  
  res.render('index.hbs')
})

http.listen(3000, () => {
  console.log(chalk.green("The server is up on port " + chalk.yellow("3000")))
})