# 📚 CampusNotes – Student Notes Sharing Platform  

A platform built for students to **upload, share, and request notes**. Designed for SVVV college, CampusNotes helps students access study material quickly, especially during exams.  

---

## ✨ Features  

- 👤 **User Profiles** – Create profile with name, course, and avatar  
- 📂 **Upload Notes** – Upload PDFs (direct-to-Cloudinary upload, upto 10MB)  
- 📥 **Download Notes** – Download without login (easy access)  
- 📝 **Request Notes** – Ask for notes if missing in library  
- 👍 **Upvote System** – Vote useful notes to highlight best content  
- ✅ **Admin Verification** – Moderators verify uploaded notes before publishing  
- 📊 **Admin Dashboard** – Stats, course/semester distribution, top notes  
- 🔍 **Search & Filters** – Search by subject, course, semester, or description  

---

## 🏗 Tech Stack  

**Frontend**  
- HTML5, CSS3, JavaScript  
- EJS (server-side rendering)  

**Backend**  
- Node.js  
- Express.js  
- MongoDB + Mongoose  

**Cloud & Deployment**  
- Cloudinary (file storage + CDN)  
- Render (backend hosting)  
- GitHub (CI/CD integration)  

---

## 📊 Usage Stats (Beta)  

- 👥 **41+ active users** in less than 1 month  
- 📑 **83+ notes uploaded**  
- 📥 **1100+ downloads (440 unique)** during 4 days of MST exams  
- 🎓 **40+ contributors** uploaded notes for classmates  

---

## 🚀 Deployment  

- **Backend**: [Render](https://render.com)  
- **File Storage**: [Cloudinary](https://cloudinary.com) (~15GB used during MST peak)  
- **Live Website**: [campusnotes.bitbros.in](https://campusnotes.bitbros.in)  

---

## 🛠 Installation & Setup  

1. Clone the repo  
   ```bash
   git clone https://github.com/yash-pouranik/campusNotes.git
   cd campusNotes
   ```
2. Install dependencies
   ```npm install```

3. Create a .env file
   ```
    SECRET=secret
    MONGODB_URI=
    API_SEC=
    USER_EMAIL=
    EMAIL_PASS=
    GOOGLE_CLIENT_ID=
    
    CLOUD1_NAME=
    CLOUD1_KEY=
    CLOUD1_SECRET=
    
    CLOUD2_NAME=
    CLOUD2_KEY=
    CLOUD2_SECRET=
    
    CLOUD3_NAME=
    CLOUD3_KEY=
    CLOUD3_SECRET=
   ```

4. Run the server
   ```npm start```

## Security
- Uses signed Cloudinary upload signatures for secure client uploads
- Session & cookies for tracking downloads (unique analytics)
- Moderator-only verification for uploaded notes

## Roadmap 

 - Progressive Web App (PWA) – installable on mobile, offline support
 - AI-based Recommendations – suggest most useful notes based on course/semester
 - Exam/Deadline Reminders – smart notifications to students for MST/Finals
 - Collaborative Notes Editing – allow group contributions on a single note
 - Advanced Analytics Dashboard – show upload/download trends to CRs & admins
 - In-app Discussion/Comments – let students discuss notes, doubts, corrections
 - Integration with Drive/Dropbox – backup or sync notes from other platforms
 - Inter-college Sharing – expand CampusNotes beyond SVVV

## Contributing
  ## Contributions are welcome! 🎉
    Fork the repo
    Create a branch (git checkout -b feature/newFeature)
    Commit changes (git commit -m 'Add new feature')
    Push (git push origin feature/newFeature)
    Create Pull Request

## Contact

**Team BitBros** – Built at **SVVV**

  Maintainer: @yash-pouranik || mail: yashpouranik@bitbros.in
  Live: campusnotes.bitbros.in
