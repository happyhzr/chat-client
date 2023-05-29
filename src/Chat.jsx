import { useContext, useEffect, useRef, useState } from "react"
import { uniqBy } from "lodash"
import axios from "axios"

import Logo from "./Logo"
import { UserContext } from "./UserContext"
import Contact from "./Contact"

export default function Chat() {
    const [ws, setWs] = useState(null)
    const [onlinePeople, setOnlinePeople] = useState({})
    const [offlinePeople, setOfflinePeople] = useState({})
    const [selectedUserId, setSelectedUserId] = useState(null)
    const [newMessageText, setNewMessageText] = useState("")
    const [messages, setMessages] = useState([])
    const { id, username, setId, setUsername } = useContext(UserContext)
    const divUnderMessages = useRef()
    useEffect(() => {
        connectToWs()
    }, [])
    function connectToWs() {
        const ws = new WebSocket("ws://localhost:4040")
        setWs(ws)
        ws.addEventListener("message", handleMessage)
        ws.addEventListener("close", () => {
            setTimeout(() => {
                console.log("Disconnect. Trying to reconnect.")
                connectToWs()
            }, 1000);
        })
    }
    function handleMessage(e) {
        const messageData = JSON.parse(e.data)
        if ("online" in messageData) {
            showOnlinePeople(messageData.online)
        } else if ("text" in messageData) {
            if (messageData.sender === selectedUserId) {
                setMessages(prev => [...prev, { ...messageData }])
            }
        }
    }
    function showOnlinePeople(peopleArray) {
        const people = {}
        peopleArray.forEach(({ userId, username }) => people[userId] = username)
        setOnlinePeople(people)
    }
    async function logout() {
        await axios.post("/logout")
        setWs(null)
        setId(null)
        setUsername(null)
    }
    async function sendMessage(e, file = null) {
        if (e) {
            e.preventDefault()
        }
        ws.send(JSON.stringify({
            recipient: selectedUserId,
            text: newMessageText,
            file,
        }))
        setNewMessageText("")
        if (file) {
            const res = await axios.get(`/messages/${selectedUserId}`)
            setMessages(res.data)
        } else {
            setMessages(prev => [...prev, {
                text: newMessageText,
                sender: id,
                recipient: selectedUserId,
                _id: Date.now(),
            }])

        }
    }
    function sendFile(e) {
        const reader = new FileReader()
        reader.readAsDataURL(e.target.files[0])
        reader.onload = () => {
            console.log(e)
            sendMessage(null, {
                name: e.target.files[0].name,
                data: reader.result,
            })
        }
    }
    useEffect(() => {
        const div = divUnderMessages.current
        if (div) {
            div.scrollIntoView({ behavior: "smooth", block: "end" })
        }
    }, [messages])
    useEffect(() => {
        async function fetchData() {
            const res = await axios.get("/people")
            const offlinePeopleArr = res.data.filter(p => p._id !== id).filter(p => !Object.keys(onlinePeople).includes(p._id))
            const offlinePeople = {}
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p
            })
            setOfflinePeople(offlinePeople)
        }
        fetchData();
    }, [onlinePeople])
    useEffect(() => {
        async function fetchData() {
            if (selectedUserId) {
                const res = await axios.get(`/messages/${selectedUserId}`)
                setMessages(res.data)
            }
        }
        fetchData();
    }, [selectedUserId])
    const onlinePeopleExclOurUser = { ...onlinePeople }
    delete onlinePeopleExclOurUser[id]
    const messageWithoutDupes = uniqBy(messages, "_id")
    return (
        <div className="flex h-screen">
            <div className="bg-white w-1/3 flex flex-col">
                <div className="flex-grow">
                    <Logo />
                    {
                        Object.keys(onlinePeopleExclOurUser).map(userId => (
                            <Contact
                                key={userId}
                                id={userId}
                                online={true}
                                username={onlinePeopleExclOurUser[userId]}
                                onClick={() => setSelectedUserId(userId)}
                                selected={userId === selectedUserId}
                            />
                        ))
                    }
                    {
                        Object.keys(offlinePeople).map(userId => (
                            <Contact
                                key={userId}
                                id={userId}
                                online={false}
                                username={offlinePeople[userId].username}
                                onClick={() => setSelectedUserId(userId)}
                                selected={userId === selectedUserId}
                            />
                        ))
                    }
                </div>
                <div className="p-2 text-center flex items-center">
                    <span className="mr-2 text-sm text-gray-600 items-center">Welcome {username}</span>
                    <button
                        onClick={logout}
                        className="text-sm bg-blue-100 py-1 px-2 text-gray-500 border rounded-sm"
                    >
                        Logout
                    </button>
                </div>
            </div>
            <div className="flex flex-col bg-blue-50 w-2/3 p-2">
                <div className="flex-grow">
                    {
                        !selectedUserId && (
                            <div className="flex h-full items-center justify-center">
                                <div className="text-gray-300">
                                    &larr; Select a person from the sidebar
                                </div>
                            </div>
                        )
                    }
                    {
                        selectedUserId && (
                            <div className="mb-4 h-full">
                                <div className="relative h-full">
                                    <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                        {
                                            messageWithoutDupes.map(message => (
                                                <div key={message._id} className={(message.sender === id ? "text-right" : "text-left")}>
                                                    <div className={"text-left inline-block p-2 m-2 rounded-md text-sm " + (message.sender === id ? "bg-blue-500 text-white" : "bg-white text-gray-500")}>
                                                        {message.text}
                                                        {
                                                            message.file && (
                                                                <div>
                                                                    <a target="_blank" href={axios.defaults.baseURL + "/uploads/" + message.file} className="underline">
                                                                        {message.file}
                                                                    </a>
                                                                </div>
                                                            )
                                                        }
                                                    </div>
                                                </div>
                                            ))
                                        }
                                        <div ref={divUnderMessages} className="h-12"></div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                </div>
                {selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input
                            value={newMessageText}
                            onChange={e => setNewMessageText(e.target.value)}
                            type="text"
                            placeholder="Type your message here"
                            className="bg-white flex-grow border rounded-sm p-2 "
                        />
                        <label type="button" className="bg-blue-200 p-2 text-gray-600 rounded-sm border border-blue-200">
                            <input type="file" className="hidden" onChange={sendFile} />
                            File
                        </label>
                        <button type="submit" className="bg-blue-500 p-2 text-white rounded-sm">Send</button>
                    </form>
                )}
            </div>
        </div >
    )
}