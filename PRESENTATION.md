# System Design and Testing Presentation

## 4.5 Input Design

Input design is the process of converting user-oriented inputs into a computer-based format. The goal is to make data entry as easy and error-free as possible. In the Digital Room Reader (DRR) project, we have designed several input interfaces to ensure secure and efficient data handling.

### 1. User Authentication Inputs
The system requires users to register and log in to access the platform.
- **Registration Form**: Collects Name, Email, Password, Phone Number, and Institute ID. It features role selection between "Reader" and "Admin". 
  - **Secure Admin Registration**: If "Admin" is selected, an additional "Admin Access Secret Key" field appears, requiring a private key for validation to prevent unauthorized administrative access.
- **Login Form**: Requires Email and Password for access.

![Login Page](./screenshots/login_page.png)
*Figure 4.5.1: Login Page Interface*

![Registration Page](./screenshots/register_page.png)
*Figure 4.5.2: Registration Page Interface*

### 2. Admin Inputs
Admins have access to specialized input forms for managing the system's content.
- **Upload Form**: Allows admins to upload PDF documents. It includes dropdowns for selecting the Course, Semester, and Subject, and a file picker for the PDF.
- **Metadata Inputs**: Input fields for defining Courses, Semesters, and Subjects.

![Admin Upload Interface](./screenshots/admin_upload.png)
*Figure 4.5.3: Admin Document Upload Interface*

---

## 4.6 Output Design

Output design is crucial for presenting information to users in an understandable and useful format. The DRR system provides several output views.

### 1. Dashboard & Document List
The main output for users is the list of available study materials.
- **PDF Cards**: Displays the title, subject, and semester of each document in a card layout.
- **Filtering**: Outputs are filtered based on the user's selection (Course/Semester).

![Main Dashboard](./screenshots/main_dashboard.png)
*Figure 4.6.1: Main Dashboard with Document Cards*

### 2. Document Viewer
When a user selects a document, the system outputs the content in a dedicated viewer.
- **PDF Reader**: Renders the PDF file directly in the browser, allowing users to scroll and read without downloading.

![PDF Reader](./screenshots/pdf_reader.png)
*Figure 4.6.2: PDF Reader Interface*

### 3. My Collection
Users can save documents to their personal collection. The output is a personalized list of saved resources.

![My Collection](./screenshots/my_collection.png)
*Figure 4.6.3: "My Collection" Output*

---

# Chapter-5 System Testing

## 5.1 System Testing
System testing ensures that the complete and integrated software acts in accordance with the specified requirements. We performed meaningful testing on the DRR project to verify its functionality, reliability, and performance.

## 5.1.1 Output Testing
Output testing validates that the system provides the correct results for a given set of inputs.
- **Search Functionality**: Verified that searching for a specific subject returns only relevant documents.
- **Document Rendering**: Verified that uploaded PDFs are correctly rendered in the viewer without corruption.
- **Collection**: Confirmed that adding a document to "My Collection" correctly updates the output list.

![Search Results](./screenshots/search_results.png)
*Figure 5.1.1: Correct Search Results Output*

## 5.1.2 Validation and Verification Testing
This testing ensures the system meets the user's needs and that the data is handled correctly.

### Validation
- **Form Validation**: Enhanced user experience by ensuring that the "Register" button is disabled until all required fields are filled.
- **Admin Verification**: The backend strictly validates the provided "Admin Secret Key" against the server configuration. Incorrect keys result in access denial.
- **File Type Validation**: The upload system restricts files to `.pdf` formats, preventing invalid file uploads.

### Verification
- **Login Verification**: Verified that only registered users with correct credentials can access the system.
- **Role Verification**: Verified that only users with the 'Admin' role can access the Upload and Analytics dashboards.

![Form Validation](./screenshots/form_validation.png)
*Figure 5.1.2: Form Validation Error Messages*

---

# Chapter-6 Conclusion & Future Enhancement

## 6.1 Conclusion
The "Digital Room Reader" (DRR) project successfully addresses the need for a centralized, digital platform for academic resources. By implementing a robust MERN stack architecture, we have created a system that allows:
- **Secure Access**: User authentication and role-based access control.
- **Efficient Management**: Admin tools for organizing content by Course, Semester, and Subject.
- **Easy Access**: specific views for reading and managing personal collections.

The system meets the primary objectives of reducing physical paper usage and improving the accessibility of study materials for students.

## 6.2 Future Enhancements
To further improve the system, several enhancements are planned:
1. **Mobile Application**: Developing a native mobile app for better accessibility on smartphones.
2. **AI Recommendations**: Implementing machine learning to recommend study materials based on a student's reading history.
3. **Discussion Forums**: Adding a feature for students to discuss topics directly within the document viewer.
4. **Offline Access**: Enabling offline caching of documents for reading without internet.

---

# Chapter-7 Bibliography & References

## 7.1 Books References
1. **"Pro MERN Stack"** by Vasan Subramanian - For understanding full-stack development.
2. **"JavaScript: The Good Parts"** by Douglas Crockford - For best practices in JavaScript coding.
3. **"Learning React"** by Alex Banks and Eve Porcello - For React component design.

## 7.2 Web References
1. **React Documentation** - [https://react.dev/](https://react.dev/)
2. **Node.js Documentation** - [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
3. **MongoDB Manual** - [https://www.mongodb.com/docs/manual/](https://www.mongodb.com/docs/manual/)
4. **Express.js API Reference** - [https://expressjs.com/en/4x/api.html](https://expressjs.com/en/4x/api.html)
5. **Tailwind CSS Documentation** - [https://tailwindcss.com/docs](https://tailwindcss.com/docs)
