import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        let log = `Connected to DB\n`;
        const count = await mongoose.connection.db.collection('assignments').countDocuments();
        log += `Total assignments: ${count}\n`;
        const latest = await mongoose.connection.db.collection('assignments').find({}).sort({ createdAt: -1 }).limit(1).toArray();
        if (latest.length > 0) {
            log += `Latest assignment ID: ${latest[0]._id}, Created: ${latest[0].createdAt}, Status: ${latest[0].status}\n`;
        }

        fs.writeFileSync('db_check_result.txt', log);
        console.log("Done. Check db_check_result.txt");
        await mongoose.disconnect();
    } catch (e) {
        fs.writeFileSync('db_check_result.txt', e.stack);
        console.error(e);
    }
};
run();
