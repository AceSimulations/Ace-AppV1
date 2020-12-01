const request = require('request');
const express = require('express');
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const hbs = require('hbs');
const fs = require('fs');
const nodemailer = require('nodemailer')
const path = require('path');
const chalk = require('chalk')
const Database = require('@replit/database')
const db = new Database()
const Cryptr = require('cryptr')
const cryptr = new Cryptr('cIeJJQpIpHo95UL9SZyq')

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
app.use(express.json())
app.set('view engine', 'hbs')
app.set('views', 'public/views')

io.on('connection', (socket) => {

  socket.on('send-message', (username, message, type, user) => {
    try {
      var messages = JSON.parse(fs.readFileSync('public/userinfo/users/' + username + '/messages.json'))
      var messageData = {
        username,
        message,
        type,
        user
      }
      messages.push(messageData)
      fs.writeFileSync('public/userinfo/users/' + username + '/messages.json', JSON.stringify(messages))
      socket.emit('recieve-message', messageData)
    } catch (e) {
      var messageData = [{
        username,
        message,
        type,
        user
      }]
      fs.writeFileSync('public/userinfo/users/' + username + '/messages.json', JSON.stringify(messageData))
      socket.emit('recieve-message', messageData)
    }
  })
  socket.on('user-typing', () => {

  })
  socket.on('request-dest-data', () => {
    var dataBuffer = fs.readFileSync('public/destinations/destinationList.json')
    var parsedData = JSON.parse(dataBuffer)
    socket.emit('dest-req-return', (parsedData))
  })
  socket.on('request-destination-load', (username) => {
    var dataBuffer = fs.readFileSync('public/userinfo/users/' + username + '/' + username + '.json')
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
          } else {
            if (every == parsedData.length) {
              console.log('passfail')
              socket.emit('login-password-fail')
            } else {

            }
          }
        })
      } else {
        if (every == parsedData.length) {
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

app.post('/get-destinations', (req, res) => {
  res.send(fs.readFileSync('public/destinations/destinationList.json'))
})

app.get('/save-flights', (req, res) => {
  var dataBuffer = fs.readFileSync('public/userinfo/users/' + req.query.username + "/" + req.query.username + '.json')
  var data = JSON.parse(dataBuffer)
  data.push({
    flightName: req.query.name,
    flightDate: req.query.date,
    flightType: req.query.type,
    flightShort: req.query.short,
    checkedIn: "false"
  })
  var bufferData = JSON.stringify(data)
  fs.writeFileSync('public/userinfo/users/' + req.query.username + '/' + req.query.username + '.json', bufferData)
  var sendValue = "<script>window.location = '/my-flights?short=" + req.query.short + "'</script>"
  console.log(sendValue)
  transport.sendMail({ to: req.query.email, from: 'Ace Airlines <aceairofficial@gmail.com', subject: 'Your booked a flight!', html: "<html><head><link href='https://fonts.googleapis.com/css2?family=Roboto&display=swap' rel='stylesheet'></head><body style='padding: 40px; background-color: #f1f1f1;'><center><div style='width: 400px; height: 750px; background-color: white; border: 1px solid; text-align: left;'><center><img src='http://ace-app.aceairlines.repl.co/acelogo.png' style='width: 100px; margin-top: 20px;'></center><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Hello " + req.query.username + ",</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you for booking a flight with us! Here are the details:</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Flight Location: " + req.query.name + "</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Flight Departure Date: " + req.query.date + "</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Flight Type: " + req.query.type + "</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you for booking a flight with us! We hope it is satisfactory! If not, please let a representative know.</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px; margin-bottom: 10px;'>Thank you,</p><p style='margin: 20px; font-family: roboto; margin-top: 0px; font-size: 20px;'>Ace Airlines</p></div></center></body></html>" }, (err, response) => {
    if (err) {
      console.log('App was not able send email to desired account. ERROR packet:')
      console.log('\n' + err + '\n')
    } else {
      console.log('Email sent to ' + req.query.email + '.')
    }
    res.send(sendValue)
  })
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
  var data = JSON.parse(fs.readFileSync("public/userinfo/users/" + req.query.username + "/" + req.query.username + ".json"))
  var empty = []
  empty.push({
    username: req.query.username
  })
  fs.writeFileSync("public/userinfo/users/" + req.query.username + "/" + req.query.username + ".json", JSON.stringify(empty))
  res.send("<script>window.location = '/my-flights'</script>")

})

app.get('/confirm-check-in', (req, res) => {
  res.render('ConfirmCheckIn.hbs')
})

app.get('/flight-radar', (req, res) => {
  res.render('AceRadar.hbs')
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
  var dataBuffer = fs.readFileSync('public/userinfo/users/' + checkInUsername + '/' + checkInUsername + '.json')
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
      fs.writeFileSync('public/userinfo/users/' + checkInUsername + '/' + checkInUsername + '.json', stringNewData)
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
  var data = JSON.parse(fs.readFileSync('public/userinfo/users/' + req.query.username + '/' + req.query.username + ".json"))
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

// As of 11/11/2020 12:01 PM

app.get('/authorize', async (req, res) => {
  var key = await db.get('apikey').then(value => {
    return value.key
  })
  if (key === req.query.key) {
    var userdb = await JSON.parse(fs.readFileSync('public/userinfo/userInfo.json'))
    var user = userdb.find((user) => {
      return user.username === cryptr.decrypt(req.query.username)
    })
    if (user) {
      console.log('user found')
      request({url: 'https://api.hashify.net/hash/sha3-512/hex?value=' + cryptr.decrypt(req.query.password), json: true}, (err, response) => {
        if (response.body.Digest === user.password) {
          res.send({
            status: 200
          })
        } else {
          res.send({
            status: 401
          })
        }
      })
    } else {
      res.send({
        error: 401,
        status: 'No user found.'
      })
    }
  } else {
    res.send({
      error: 401,
      msg: 'No access.'
    })
  }
})

// As of when I didn't know how to code :) (below)

app.get('/connect', (req, res) => {
  if (req.query.query === 'get-destinations') {
    res.sendFile(path.join(__dirname + '/public/destinations/destinationList.json'))
  } else if (req.query.query === 'static-book') {
    var staticInfo = []
    staticInfo.push(JSON.parse(req.query.info))
    console.log('Writing static book for [' + req.query.user + ']...')
    fs.writeFileSync('public/userinfo/users/' + req.query.user + '/' + 'static.json', JSON.stringify(staticInfo))
    res.send('Completed static request.')
  } else if (req.query.query === 'grab-static-book') {
    console.log('Grabbing static for book...')
    res.send(fs.readFileSync('public/userinfo/users/' + req.query.user + '/static.json'))
    console.log(chalk.green('Modifier and task    [ COMPLETE ]'))
  } else if (req.query.query === "modify-user") {
    console.log(req.query.user)
    var inbound = JSON.parse(req.query.data)
    var userData = JSON.parse(fs.readFileSync('public/userinfo/users/' + req.query.user + "/" + req.query.user + ".json"))
    var replacementIndex = 0
    for (var x = 0; x < userData.length - 1; x++) {
      var names = [
        {
          name: "flightName"
        },
        {
          name: "flightDate"
        },
        {
          name: "flightType"
        },
        {
          name: "flightShort"
        },
        {
          name: "checkedIn"
        }]

      var matches = []

      for (var y = 0; y < 5; y++) {
        if (inbound[names[y].name] === userData[x][names[y].name]) {
          matches.push(y)
        } else {
        }
        if (y === 4) {
          if (matches.length === 5) {
            replacementIndex = x
          } else {

          }
        }
      }
    }
    console.log(replacementIndex)
    inbound.checked = 'true'
    userData.splice(replacementIndex, 1, inbound)
    fs.writeFileSync('public/userinfo/users/' + req.query.user + '/' + req.query.user + '.json', JSON.stringify(userData))
  } else if (req.query.query == 'add-destinations') {
    if (req.query.data) {
      var data = JSON.parse(req.query.data)
      var getData = JSON.parse(fs.readFileSync('public/destinations/destinationList.json'))
      getData.push(data)
      fs.writeFileSync('public/destinations/destinationList.json', JSON.stringify(getData))
      res.send({
        status: "success"
      })
    } else {
      res.send({
        status: "failure"
      })
    }
  } else if (req.query.query === 'delete-index') {
    var destinationData = JSON.parse(fs.readFileSync('public/destinations/destinationList.json'))
    var data = destinationData.splice(req.query.data, 1)
    console.log(data)
    fs.writeFileSync('public/destinations/destinationList.json', JSON.stringify(destinationData))
    res.send({
      status: "success"
    })
  } else if (req.query.query === "book-flight") {
    console.log(chalk.inverse('Creating book profile for user [' + req.query.user + ']...'))
    var user = JSON.parse(fs.readFileSync('public/userinfo/users/' + req.query.user + "/" + req.query.user + ".json"))
    user.push(JSON.parse(req.query.data))
    fs.writeFileSync('public/userinfo/users/' + req.query.user + "/" + req.query.user + ".json", JSON.stringify(user))
    console.log('Completed desired task.')
    res.send({
      status: "success",
      user: req.query.user
    })
  } else if (req.query.query === 'remove-user') {
    var username = req.query.username
    console.log(username)
    fs.unlinkSync("public/userinfo/users/" + req.query.username + '/' + req.query.username + ".json")
    var userInfo = JSON.parse(fs.readFileSync('public/userinfo/userInfo.json'))
    var index = -1
    var dataIndex = 0
    userInfo.forEach((user) => {
      index++
      if (user.username === username) {
        dataIndex = index
        console.log(dataIndex)
      }
    })
    userInfo.splice(dataIndex, 1)
    fs.writeFileSync('public/userinfo/userInfo.json', JSON.stringify(userInfo))

    // Users directory

    var users = JSON.parse(fs.readFileSync('public/userinfo/users.json'))
    index = -1
    dataIndex = 0
    users.forEach((user) => {
      index++
      if (user.username === username) {
        dataIndex = index
        console.log(index)
      }
    })
    users.splice(dataIndex, 1)
    fs.writeFileSync('public/userinfo/users.json', JSON.stringify(users))

    res.send({
      status: "success"
    })
  } else if (req.query.query === 'add-destinations-ind') {
    var getData = JSON.parse(fs.readFileSync('public/destinations/destinationList.json'))
    var changedDest = -1
    var destIndex = 0
    getData.forEach((destination) => {
      changedDest++
      if (destination.name === req.query.destination) {
        destIndex = changedDest
      }
    })
    getData[destIndex].event = JSON.parse(req.query.data)
    fs.writeFileSync('public/destinations/destinationList.json', JSON.stringify(getData))
    res.send({
      status: "success"
    })
  } else if (req.query.query == 'get-flight-count') {
    var emptyUserData = 0
    var userData = JSON.parse(fs.readFileSync('public/userinfo/users.json'))
    userData.forEach((index) => {
      if (index.username === '') {

      } else {
        var indUsrData = JSON.parse(fs.readFileSync('public/userinfo/users/' + index.username + '/' + index.username + ".json"))
        emptyUserData += indUsrData.length - 1
      }
    })
    res.send({
      count: emptyUserData
    })
  } else if (req.query.query === 'getUsers') {
    var userCount = JSON.parse(fs.readFileSync('public/userinfo/userInfo.json'))
    var count = userCount.length
    res.send({
      count: count.toString()
    })
  } else if (req.query.query === 'get-ind-flight-data') {
    var data = JSON.parse(fs.readFileSync('public/userinfo/users/' + req.query.user + '/' + req.query.user + ".json"))
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

app.post('/backup', (req, res) => {
  fs.writeFileSync('public/destinations/destinationList.json', JSON.stringify(req.body.data))
  res.send({
    status: "success"
  })
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

app.get('/resource', (req, res) => {
  res.render('resource.hbs')
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
        request({ url: "https://api.hashify.net/hash/sha3-512/hex?value=" + req.query.password, json: true }, (error, response) => {
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
          fs.mkdirSync('public/userinfo/users/' + req.query.username)
          fs.writeFileSync('public/userinfo/users/' + req.query.username + '/' + req.query.username + '.json', JSON.stringify([]))
          var userDetails = req.query.username
          transport.sendMail({ to: req.query.email, from: 'Ace Airlines <aceairofficial@gmail.com>', subject: 'Thanks for signing up for the Ace App!', html: "<html><head><link href='https://fonts.googleapis.com/css2?family=Roboto&display=swap' rel='stylesheet'></head><body style='padding: 40px; background-color: #f1f1f1;'><center><div style='width: 400px; height: 650px; background-color: white; border: 1px solid; text-align: left;'><center><img src='http://ace-app.aceairlines.repl.co/acelogo.png' style='width: 100px; margin-top: 20px;'></center><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Hello " + req.query.username + ",</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you for creating an account with Ace Airlines! If at any time you need help from a service representative, please contact us at aceairofficial@gmail.com</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>If you experience any bugs, then please report them to our forum. https://fly-great.weebly.com/forum</p><p style='margin: 20px; font-family: roboto; margin-top: 30px; font-size: 20px;'>Thank you,</p><p style='margin-left: 20px; font-family: roboto; margin-top: 0px; font-size: 20px;'>Ace Airlines</p></div></center></body></html>" }, (err, response) => {
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