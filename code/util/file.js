const fs = require('fs');

const deleteFile = (filePath)=>{
    fs.unlink(filePath , (err)=>{
        if(err){
            next(new Error(err))
        }
    })
}

exports.deleteFile = deleteFile;