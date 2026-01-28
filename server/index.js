const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./db');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Connect to Database
connectDB();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, process.env.UPLOAD_PATH || 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/courses', require('./routes/course.routes')); // Placeholder if needed
app.use('/api/semesters', require('./routes/semester.routes')); // Placeholder if needed
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/pdfs', require('./routes/pdf.routes'));
app.use('/api/notes', require('./routes/note.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.get('/', (req, res) => {
    res.send('Digital Room Reader API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
