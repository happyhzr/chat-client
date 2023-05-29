import axios from "axios";
import { createContext, useEffect, useState } from "react";

export const UserContext = createContext({})

export function UserContextProvider({ children }) {
    const [username, setUsername] = useState(null)
    const [id, setId] = useState(null)
    useEffect(() => {
        async function fetchData() {
            try {
                const response = await axios.get("profile")
                setId(response.data.userId)
                setUsername(response.data.username)
            } catch (err) {
                console.log(err)
                throw err
            }
        }
        fetchData();
    }, [])
    return (
        <UserContext.Provider value={{ username, setUsername, id, setId }}>
            {children}
        </UserContext.Provider>
    )
}