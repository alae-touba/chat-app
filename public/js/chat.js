const socket = io()
console.log(currentUser)
console.log(currentUser.username)

const divMsgs = document.querySelector("#msgs")
const inputMessage = document.querySelector("#input-message")
const btnSendMessage = document.querySelector("#btn-send-message")
const divOnlineUsers = document.querySelector("#div-online-users")
const searchBar = document.querySelector("#search-bar")
const roomName = document.querySelector("#room-name")

const updateSidebarUi = (users) => {
	divOnlineUsers.innerHTML = ""
	users.forEach((user) => {
		const newDiv = document.createElement("div")
		newDiv.className = "chat_list"

		if (user.username === currentUser.username) {
			newDiv.className += " active_chat"
		}

		newDiv.innerHTML = `
			
				<div class="chat_people">
					<div class="chat_img">
						<!-- <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil" />  -->
						<img src="/uploads/images/${user.imageName}" style="${
			user.imageName !== "default.png" ? "width:40px;height:45px;border-radius:10px;" : ""
		}" alt="profile default image"/>
					</div>
					<div class="chat_ib">
						<h5>
							${user.username} <span class="chat_date"> ${getFormatedTime(user.joinTime)} </span>
						</h5>
						<p>${user.quote} </p>
					</div>
				</div>
			
		`

		divOnlineUsers.append(newDiv)
	})
}

const appendIncomingMessage = (user, message, time) => {
	const newDiv = document.createElement("div")
	newDiv.className = "incoming_msg"
	newDiv.innerHTML = `
		<div class="incoming_msg_img">
			<!-- <img src="https://ptetutorials.com/images/user-profile.png" alt="sunil" /> -->
			<img src="/uploads/images/${user.imageName}" style="${
		user.imageName !== "default.png" ? "width:40px;height:45px;border-radius:10px;" : ""
	}" class="img-circle" alt="profile pdefault image"/>
		</div>
        <div class="received_msg">
            <div class="received_withd_msg">
                <p> <strong> ${user.username} </strong> </p>
                <p> ${message} </p>
                <span class="time_date"> ${getFormatedTime(time)} | ${getFormatedDate()} </span>
            </div>
        </div>
    `

	divMsgs.append(newDiv)
}

const appendOutgoingMessage = (user, message, time) => {
	const newDiv = document.createElement("div")
	newDiv.className = "outgoing_msg"
	newDiv.innerHTML = `
        <div class="sent_msg">
            <p> ${message} </p>
            <span class="time_date"> ${getFormatedTime(time)} | ${getFormatedDate()} </span>
        </div>
    `

	divMsgs.append(newDiv)
}

const getFormatedTime = (time) => {
	return moment(time).format("hh:mm a")
}

const getFormatedDate = () => {
	const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
	return `${months[new Date().getMonth()]} ${new Date().getDate()}`
}

searchBar.addEventListener("input", (e) => {
	const searchedName = e.target.value

	if (searchedName) {
		// the server will respond with the list of users in the same room as the current user and then i will see if the searched name is there
		socket.emit("search-an-online-user", currentUser.room, (usersInRoom) => {
			const users = usersInRoom.filter((user) => user.username !== currentUser.username && user.username.includes(searchedName))
			updateSidebarUi(users)
		})
	} else {
		socket.emit("search-an-online-user", currentUser.room, (usersInRoom) => {
			updateSidebarUi(usersInRoom)
		})
	}
})

btnSendMessage.addEventListener("click", (e) => {
	e.preventDefault()

	const message = inputMessage.value
	inputMessage.value = ""
	inputMessage.focus()

	appendOutgoingMessage(currentUser, message, new Date().getTime())

	socket.emit("send-message", message)
})

// new user wants to join a specific room
socket.emit("join", currentUser)

socket.on("welcome-event", ({ user, message, time }) => {
	appendIncomingMessage(user, message, time)
	roomName.textContent = currentUser.room
})

socket.on("new-user-joins", ({ user, message, time }) => {
	appendIncomingMessage(user, message, time)
})

socket.on("message", ({ user, message, time }) => {
	appendIncomingMessage(user, message, time)
})

socket.on("user-lefts", ({ user, message, time }) => {
	appendIncomingMessage(user, message, time)
})

//update sidebar of online users
socket.on("update-ui-of-online-users", (users) => {
	updateSidebarUi(users)
})
