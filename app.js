const createError = require("http-errors")
const express = require("express")
const path = require("path")
const http = require("http")
const cookieParser = require("cookie-parser")
const logger = require("morgan")
const multer = require("multer")
const socketio = require("socket.io")
const validator = require("express-validator")
const fs = require("fs")

const {
	getAvailableRooms,
	getUsersInRoom,
	addUser,
	getUser,
	removeUser,
	sendData,
	admin
} = require("./utils/chat-utils")

const app = express()
const server = http.createServer(app)
const io = socketio(server)

// view engine setup
app.set("views", path.join(__dirname, "views"))
app.set("view engine", "hbs")

//middlwares
// app.use(logger('dev'));
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

const users = []

//multer
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "public/uploads/images")
	},
	filename: function (req, file, cb) {
		cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname))
	}
})

const upload = multer({ storage: storage })

//routes
app.get("/", (req, res, next) => {
	if (users.length === 0) {
		res.render("join-new-room", { title: "Join A New Room" })
	} else {
		res.render("join", { rooms: getAvailableRooms(users), title: "Join A Room" })
	}
})

const validateFormFields = () => {
	return [
		validator.check("username").isLength({ min: 1 }).withMessage("username canot be empty"),
		validator.check("room").isLength({ min: 1 }).withMessage("room name cannot be empty")
	]
}

//we get here from form1 in join.hbs
app.post("/join-existing-room", upload.single("image"), validateFormFields(), (req, res, next) => {
	const errors = validator.validationResult(req)

	if (!errors.isEmpty()) {
		//res.render("join-new-room", { errorsInExistingRoomForm: errors.array() });
		res.render("join", {
			errorsInExistingRoomForm: errors.array(),
			rooms: getAvailableRooms(users),
			title: "Join A Room"
		})
	} else {
		const isUserAlreadyExists = users.find(
			(user) => user.username === req.body.username && user.room === req.body.room
		)

		if (isUserAlreadyExists) {
			res.render("join", {
				errorsInExistingRoomForm: [
					{
						msg: `this username '${req.body.username}' is already in use in room '${req.body.room}' `
					}
				],
				rooms: getAvailableRooms(users)
			})
		} else {
			res.render("chat", {
				user: JSON.stringify({
					username: req.body.username,
					room: req.body.room.trim().toLowerCase(),
					joinTime: new Date().getTime(),
					imageName: req.file ? req.file.filename : "default.png", //req.file is undefinded if no file is submited
					quote: req.body.quote
				}),
				title: "Chat Room: " + req.body.room.trim().toLowerCase()
			})
		}
	}
})

//we get to here from form2 in join.hbs
app.post("/join-new-room1", upload.single("image"), validateFormFields(), (req, res, next) => {
	const errors = validator.validationResult(req)

	if (!errors.isEmpty()) {
		res.render("join", {
			errorsInNewRoomForm: errors.array(),
			rooms: getAvailableRooms(users),
			title: "Join A Room"
		})
	} else {
		const rooms = getAvailableRooms(users)
		if (rooms.includes(req.body.room)) {
			res.render("join", {
				errorsInNewRoomForm: [
					{ msg: `there is already a room by the name of '${req.body.room}' ` }
				],
				title: "Join A Room"
			})
		} else {
			res.render("chat", {
				user: JSON.stringify({
					username: req.body.username,
					room: req.body.room.trim().toLowerCase(),
					joinTime: new Date().getTime(),
					imageName: req.file ? req.file.filename : "default.png",
					quote: req.body.quote
				}),
				title: "Chat Room: " + req.body.room.trim().toLowerCase()
			})
		}
	}
})

//we get to here from form in join-new-room.hbs
app.post("/join-new-room2", upload.single("image"), validateFormFields(), (req, res, next) => {
	const errors = validator.validationResult(req)

	if (!errors.isEmpty()) {
		res.render("join-new-room", { errors: errors.array(), title: "Join A New Room" })
	} else {
		const rooms = getAvailableRooms(users)
		if (rooms.includes(req.body.room)) {
			res.render("join-new-room", {
				errors: [{ msg: `there is already a room by the name of '${req.body.room}' ` }]
			})
		} else {
			res.render("chat", {
				user: JSON.stringify({
					username: req.body.username,
					room: req.body.room.trim().toLowerCase(),
					joinTime: new Date().getTime(),
					imageName: req.file ? req.file.filename : "default.png",
					quote: req.body.quote
				}),
				title: "Chat Room: " + req.body.room.trim().toLowerCase()
			})
		}
	}
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
	next(createError(404))
})

// error handler
app.use((err, req, res, next) => {
	// set locals, only providing error in development
	res.locals.message = err.message
	res.locals.error = req.app.get("env") === "development" ? err : {}

	// render the error page
	res.status(err.status || 500)
	res.render("error")
})

/*
	{
		"roomX": [ {user:userX, message: "#msg#", time: #time#}, ... ],
		....
	}
*/
let RoomChatHistory = {}

io.on("connection", (socket) => {
	//console.log("new websocket connection")

	//on a socket joining a room
	socket.on("join", (user) => {
		user.id = socket.id
		addUser(users, user)

		socket.join(user.room)

		// if (RoomChatHistory[user.room]) {
		// 	console.log(RoomChatHistory[user.room])
		// }
		if (!RoomChatHistory[user.room]) {
			RoomChatHistory[user.room] = []
		}
		RoomChatHistory[user.room].push({
			user: admin,
			message: `${user.username} joined the chat!`,
			time: new Date().getTime()
		})

		socket.emit(
			"see-chat-history",
			RoomChatHistory[user.room].slice(0, RoomChatHistory[user.room].length - 1)
		)
		socket.emit("welcome-event", sendData(admin, `weclome ${user.username}!`))

		//broadcast the msg(a new user joined) to all sockets (except sender) in the room
		socket.broadcast
			.to(user.room)
			.emit("new-user-joins", sendData(admin, `${user.username} joined the chat!`))

		//send event to update UI of online users in this room
		io.to(user.room).emit("update-ui-of-online-users", getUsersInRoom(users, user.room))
	})

	socket.on("send-message", (message) => {
		const user = getUser(users, socket.id)
		if (user) {
			if (!RoomChatHistory[user.room]) {
				RoomChatHistory[user.room] = []
			}

			RoomChatHistory[user.room].push({
				user,
				message,
				time: new Date().getTime()
			})

			// sending to all clients in -user.room- room except sender
			socket.broadcast.to(user.room).emit("message", sendData(user, message))
		}
	})

	socket.on("search-an-online-user", (room, callback) => {
		const usersInRoom = getUsersInRoom(users, room)
		callback(usersInRoom)
	})

	socket.on("disconnect", () => {
		const removedUser = removeUser(users, socket.id)

		if (removedUser) {
			//a user left the room

			const r = getUsersInRoom(users, removedUser.room)
			if (r.length === 0) {
				delete RoomChatHistory[removedUser.room]
			} else {
				RoomChatHistory[removedUser.room].push({
					user: admin,
					message: `${removedUser.username} left the chat!`,
					time: new Date().getTime()
				})
			}

			//=> send the message to others(all users in his room)
			io.to(removedUser.room).emit(
				"user-lefts",
				sendData(admin, `${removedUser.username} left the chat!`)
			)

			//=> send event to update UI of online users in this room
			io.to(removedUser.room).emit(
				"update-ui-of-online-users",
				getUsersInRoom(users, removedUser.room)
			)

			// if (removedUser.imageName !== "default.png") {
			// 	fs.unlink(path.join(__dirname, "public", "uploads", "images", removedUser.imageName), (err) => {
			// 		if (err) {
			// 			throw err
			// 		}
			// 	})
			// }
		}
	})
})

// module.exports = app;
const port = 3000
server.listen(port, () => console.log(`app listening at port ${port}`))
