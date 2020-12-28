db.createUser(
    {
        user: "etb",
        pwd: "ENlzPLlyv7",
        roles:[
            {
                role: "readWrite",
                db:   "wildduck"
            }
        ]
    }
);