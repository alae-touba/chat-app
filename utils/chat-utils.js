exports.getAvailableRooms = (users) => {
	let rooms = users.map((user) => user.room)
	rooms = new Set(rooms)
	rooms = [...rooms]

	return rooms
}

exports.getUsersInRoom = (users, room) => {
	return users.filter((user) => user.room === room)
}

exports.addUser = (users, user) => {
	users.push(user)
}

exports.getUser = (users, id) => {
	return users.find((user) => user.id === id)
}

exports.removeUser = (users, id) => {
	const index = users.findIndex((user) => user.id === id)

	if (index !== -1) {
		const removedUser = users.splice(index, 1)[0]
		return removedUser
	}

	return undefined
}

exports.sendData = (user, message) => {
	return {
		user,
		message,
		time: new Date().getTime(),
	}
}

exports.admin = {
	id: null,
	username: "admin",
	room: null,
	imageName: "default.png",
	joinTime: null,
	quote: null,
}
