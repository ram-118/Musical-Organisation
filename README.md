# 🎵 Musical Organisation Website

A modern web application for showcasing a musical organisation including achievements, gallery, and collaborations.

---

## 📌 Features

- 🏠 Home page with organisation details
- 📸 Gallery to display performances and photos
- 🏆 Achievements section
- 🤝 Collaborations with other organisations
- 🔐 Admin panel to:
  - Add achievements
  - Add collaborations
  - Upload images

---

## 🧠 Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB
- File Upload: Multer

---

## 📁 Project Structure


music-website/
├── server.js
├── models/
├── public/
│ ├── index.html
│ ├── admin.html
│ ├── style.css
│ ├── script.js
│ ├── admin.js
│ ├── images/


---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/ram-118/Musical-Organisation.git
cd Musical-Organisation
2. Install dependencies
npm install
3. Setup environment variables

Create .env file:

MONGO_URI=your_mongodb_connection_string
PORT=3000
▶️ Run the project
node server.js

Open in browser:

http://localhost:3000
🔐 Admin Access
Password is set in backend (.env file)
