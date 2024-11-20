import z from "zod"

async function getUser() {
    
    const userSchema = z.object({
        id: z.string(),
        email: z.string()
                .email(),
        name: z.string(),
        lastName: z.string(),
        picture: z.string()
                  .url(),
    })

    const resp = await fetch(
        "http://localhost:42069/users",
        { method: "get", credentials: "include" },
    )
    if (!resp.ok) {
        throw Error(await resp.text())
    }
    
    const user = userSchema.safeParse(JSON.parse(await resp.json()))
    if (!user.success) {
        throw Error(
            "Invalid response.",
            { cause: user.error },
        )
    }

    return user.data
}
