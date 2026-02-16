const mongoose = require("mongoose")
const User = require("../models/user")
const {addBulkEmailJob} = require("../queues/bulkEmail.queue");

async function getAllUsers(requestData) {
    try{
        const users = await User.find(
        { _id: { $ne: requestData._id } },
        "email"
        );

        const emailList = users.map((u) => u.email);


        
        for(let i = 0; i<emailList.length; i++) {
            const data = {
                requestData: requestData,
                email: emailList[i],
            }
            await addBulkEmailJob(data);
        };
    } catch(e) {
        console.log(e);
    }
}

module.exports = { getAllUsers };