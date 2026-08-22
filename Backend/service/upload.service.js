const streamifier=require("streamifier");const cloudinary=require("../config/cloudinary");
const uploadBuffer=(file,folder="auto-dealer/inspections")=>new Promise((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({folder,resource_type:"image"},(error,result)=>error?reject(error):resolve({url:result.secure_url,public_id:result.public_id}));streamifier.createReadStream(file.buffer).pipe(stream);});
module.exports={uploadBuffer};
