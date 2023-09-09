import pkg from 'pg';
const { Pool } = pkg;

// RDS

// NPM PG - Pool
const pool = new Pool({
    user: 'xxxx',
    host: 'xxxx',
    database: 'xxxx',
    password: 'xxxx!',
    port: 5432,
})

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err)
    process.exit(-1)
});

// Lambda Handler
export const lambdaHandler = async (event, context) => {
    try {
        // Variables
        let result;
        let data;

        // SQL Handler
        // Event Path/Resource and HTTP Method
        switch (true) {
            // path .../HEALTH
            case (event.path === "/health" && event.httpMethod === "GET"):  // health check (Left Panel)
                data = "status 200 - health path check";
                break;

            // path .../STUDENTS
            case (event.path === "/students"):  // 'GET' all students, 'POST' new student
                switch (true) {
                    case (event.httpMethod === "GET"):  // 'GET' all students (Left Panel)
                        result = await pool.query('SELECT * FROM student ORDER BY student_id ASC');
                        data = result.rows;
                        break;
                    case (event.httpMethod === "POST"):  // 'POST' new student (Right Panel)
                        const newStudent = JSON.parse(event.body);
                        result = await pool.query('INSERT INTO student(first_name, last_name, email) VALUES($1, $2, $3) RETURNING *', [newStudent.first_name, newStudent.last_name, newStudent.email]);
                        data = result.rows[0];
                        break;
                    default:
                        console.log("Unexpected httpMethod for /students");
                        data = "Unexpected httpMethod for /students";
                        break;
                }
                break;

            // path .../STUDENTS/{studentId}
            case (event.resource === "/students/{studentId}"):  // 'GET' specific student, 'PATCH' specific student, 'DELETE' specific student
                switch (true) {
                    case (event.httpMethod === "GET"):  // 'GET' specific student (Right Panel)
                        const getStudentId = event.pathParameters.studentId;
                        result = await pool.query('SELECT * FROM student WHERE student_id = $1', [getStudentId]);
                        data = result.rows[0];
                        break;
                    case (event.httpMethod === "PATCH"):  // 'PATCH' specific student (Right Panel)
                        const patchStudentId = event.pathParameters.studentId;
                        const updatedFields = JSON.parse(event.body); // ie. { "first_name": "updated_first", "last_name": "updated_last" }

                        let patchText = 'UPDATE student SET';
                        let patchValues = []; // PatchValues paramertized

                        for (const key in updatedFields) {
                            patchText += ` ${key}=$${patchValues.length + 1},`; // Example: "... first_name=$1, last_name=$2,"
                            patchValues.push(updatedFields[key]);
                        };
                        patchText = patchText.replace(/,$/, ''); // Remove the trailing comma
                        patchText += ` WHERE student_id=$${patchValues.length + 1} RETURNING *`; // ie. "... WHERE student_id=$3"
                        patchValues.push(patchStudentId);

                        result = await pool.query(patchText, patchValues);
                        data = result.rows[0];
                        break;
                    case (event.httpMethod === "DELETE"):  // 'DELETE' specific student (Right Panel)
                        const deleteStudentId = event.pathParameters.studentId;
                        result = await pool.query('DELETE FROM student WHERE student_id = $1', [deleteStudentId]);
                        data = `Deleted Succesfully`;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /students/{studentId}");
                        data = "Unexpected httpMethod for /students/{studentId}";
                        break;
                }
                break;

            // path .../COURSE
            case (event.path === "/course"):  // 'GET' all courses, 'POST' new course
                switch (true) {
                    case (event.httpMethod === "GET"):  // 'GET' all courses (Left Panel - ADDED)
                        result = await pool.query('SELECT * FROM course ORDER BY course_id ASC;');
                        data = result.rows;
                        break;
                    case (event.httpMethod === "POST"):  // 'POST' new course (Right Panel - ADDED)
                        const newCourse = JSON.parse(event.body);
                        result = await pool.query('INSERT INTO course (name, description) VALUES($1, $2) RETURNING *', [newCourse.name, newCourse.description]);
                        data = result.rows[0];
                        break;
                    default:
                        console.log("Unexpected httpMethod for /course");
                        data = "Unexpected httpMethod for /course";
                        break;
                }
                break;

            // path .../COURSE/{courseId}
            case (event.resource === "/course/{courseId}"):  //'GET' specific course, 'PATCH' existing course, 'DELETE' existing course
                switch (true) {
                    case (event.httpMethod === "GET"):  // 'GET' specific course (Right Panel - ADDED)
                        const getCourseId = event.pathParameters.courseId;
                        result = await pool.query('SELECT * FROM course WHERE course_id = $1', [getCourseId]);
                        data = result.rows[0];
                        break;
                    case (event.httpMethod === "PATCH"):  // 'PATCH' existing course (Right Panel - ADDED)
                        const patchCourseId = event.pathParameters.courseId;
                        const updatedFields = JSON.parse(event.body); // ie. { "name": "updated_first", "description": "updated_description" }

                        let patchText = 'UPDATE course SET';
                        let patchValues = []; // PatchValues paramertized

                        for (const key in updatedFields) {
                            patchText += ` ${key}=$${patchValues.length + 1},`;  // Example: "... name=$1, description=$2,"
                            patchValues.push(updatedFields[key]);
                        };
                        patchText = patchText.replace(/,$/, ''); // Remove the trailing comma
                        patchText += ` WHERE course_id=$${patchValues.length + 1} RETURNING *`; // ie. "... WHERE course_id=$3" last param is the ID
                        patchValues.push(patchCourseId);

                        result = await pool.query(patchText, patchValues);
                        data = result.rows[0];
                        break;
                    case (event.httpMethod === "DELETE"):  // 'DELETE' existing course (Right Panel - ADDED)
                        const deleteCourseId = event.pathParameters.courseId;
                        result = await pool.query('DELETE FROM course WHERE course_id = $1', [deleteCourseId]);
                        data = `Deleted Succesfully`;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /course/{courseId}");
                        data = "Unexpected httpMethod for /course/{courseId}";
                        break;
                }
                break;

            // path .../REGISTRATION/{studentId}
            case (event.resource === "/registration/{studentId}"):
                switch (true) {
                    case (event.httpMethod == "GET"): // 'GET' course registration (all courses) for a specific student (Right Panel - ADDED)
                        const studentIdForRegistrationAll = event.pathParameters.studentId;
                        const allRegistrationQuery = 'SELECT course.course_id, course.name FROM registration, course WHERE registration.course_id = course.course_id AND registration.student_id = $1';
                        const allRegistrationParams = [studentIdForRegistrationAll];

                        result = await pool.query(allRegistrationQuery, allRegistrationParams);
                        data = result.rows;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /registration/{studentId}");
                        data = "Unexpected httpMethod for /registration/{studentId}";
                        break;
                }
                break;

            // path .../REGISTRATION/{studentId}/{courseId}
            case (event.resource === "/registration/{studentId}/{courseId}"):  // 'POST' new course to student in registration, 'DELETE' a course from student in registration
                // StudentId and CourseId to use in both DELETE and POST method
                const studentId = event.pathParameters.studentId;
                const courseId = event.pathParameters.courseId;
                switch (true) {
                    case (event.httpMethod === "DELETE"):  // 'DELETE' a course from student in registration (RIGHT PANEL - ADDED)
                        // Delete a Course from a Student
                        const deleteQuery = 'DELETE FROM registration WHERE student_id = $1 AND course_id = $2';
                        const deleteParameters = [studentId, courseId];
                        await pool.query(deleteQuery, deleteParameters);  // SQL Query to Delete
                        data = 'Succesfully Removed'
                        break;
                    case (event.httpMethod === "POST"):  // 'POST' new course to student in registration
                        // POST a new Course to Student
                        const postQuery = 'INSERT INTO registration (student_id, course_id) VALUES ($1, $2)';
                        const postParameters = [studentId, courseId];
                        await pool.query(postQuery, postParameters);   // SQL Query to Post
                        data = 'Succesfully Added'
                        break;
                    default:
                        console.log("Unexpected httpMethod for /registration/{studentId}/{courseId}");
                        data = "Unexpected httpMethod for /registration/{studentId}/{courseId}";
                        break;
                }
                break;

            // path .../ASSIGNMENT/{courseId}
            case (event.resource === "/assignment/{courseId}"):  // 'POST' new assignment to a course, 'GET' all assignments from a course
                switch (true) {
                    case (event.httpMethod === "POST"):  // 'POST' new assignment (RIGHT-PANEL COMPLETED)
                        // Variables and Parsing
                        const newAssCourseId = event.pathParameters.courseId;
                        const newAssCourseBody = JSON.parse(event.body);
                        // Query and Params
                        const newAssQuery = 'INSERT INTO assignment (course_id, name, description) VALUES ($1, $2, $3) RETURNING *';
                        const newAssParams = [newAssCourseId, newAssCourseBody.name, newAssCourseBody.description];
                        // Pool and Result
                        result = await pool.query(newAssQuery, newAssParams);
                        data = result.rows[0];
                        break;
                    case (event.httpMethod === "GET"):  // 'GET' all assignments from a course (LEFT-PANEL - COMPLETED)
                        // Variables and Parsing
                        const getAllAssCourseId = event.pathParameters.courseId;
                        // Query and Params
                        const getAllAssFromCourseQuery = 'SELECT * FROM assignment WHERE course_id = $1';
                        const getAllAssFromCourseParams = [getAllAssCourseId];
                        // Pool and Result
                        result = await pool.query(getAllAssFromCourseQuery, getAllAssFromCourseParams);
                        data = result.rows;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /assignment");
                        data = "Unexpected httpMethod for /assignment";
                        break;
                }
                break;

            // path .../ASSIGNMENT/{courseId}/{assignmentId}
            case (event.resource === "/assignment/{courseId}/{assignmentId}"): // 'DELETE' assignment from course, 'PATCH' Assignment from course, 'GET" Assignment with ass id, 'POST' assignment to student
                switch (true) {
                    case (event.httpMethod === "DELETE"): // 'DELETE' assignment by assignmentId (RIGHT-PANEL COMPLETED)
                        // Variables
                        const deleteAssAssignmentId = event.pathParameters.assignmentId;
                        // Query and Params
                        const deleteAssQuery = 'DELETE FROM assignment WHERE assignment_id = $1';
                        const deleteAssParams = [deleteAssAssignmentId];
                        // Pool and Result
                        await pool.query(deleteAssQuery, deleteAssParams);
                        data = `Deleted Succesfully`;
                        break;
                    case (event.httpMethod === "PATCH"):  // 'UPDATE' assignment by assignmentId (RIGHT-PANEL COMPLETED)
                        // Variables
                        const updateAssAssignmentId = event.pathParameters.assignmentId;
                        const updateAssBody = JSON.parse(event.body); // ie. { "name": "updated_name", "description": "updated_description" }
                        // Query and Params
                        let updateAssQuery = 'UPDATE assignment SET';
                        let updateAssParams = [];

                        for (const key in updateAssBody) {
                            updateAssQuery += ` ${key}=$${updateAssParams.length + 1},`;  // Example: "... name=$1, description=$2,"
                            updateAssParams.push(updateAssBody[key]);
                        };

                        updateAssQuery = updateAssQuery.replace(/,$/, ''); // Remove the trailing comma
                        updateAssQuery += ` WHERE assignment_id=$${updateAssParams.length + 1} RETURNING *`; // ie. "... WHERE assignment_id=$3" last param is the assignmentId
                        updateAssParams.push(updateAssAssignmentId);
                        // Pool and Result
                        result = await pool.query(updateAssQuery, updateAssParams);
                        console.log("---result---", result);
                        data = result.rows[0];
                        break;
                    case (event.httpMethod === "GET"): // 'GET' assignment by assignmentId (RIGHT-PANEL COMPLETED)
                        // Variables
                        const getAssAssignmentId = event.pathParameters.assignmentId;
                        // Query and Params
                        const getAssQuery = 'SELECT * FROM assignment WHERE assignment_id = $1 ';
                        const getAssParams = [getAssAssignmentId];
                        // Pool and Result
                        result = await pool.query(getAssQuery, getAssParams);
                        data = result.rows[0]
                        break;
                    case (event.httpMethod === "POST"): // 'POST' assignment to student (RIGHT-PANEL (STUASS POST) - COMPLETED)
                        // Variables
                        const addAssAssignmentId = event.pathParameters.assignmentId;
                        const addAssBody = JSON.parse(event.body);
                        // Query and Params
                        const addAssQuery = 'INSERT INTO student_assignment (student_id, assignment_id) VALUES ($1, $2)';
                        const addAssParameters = [addAssBody.student_id, addAssAssignmentId];
                        // Pool and Result
                        await pool.query(addAssQuery, addAssParameters);
                        data = `Assignment added to Student Successfully`;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /assignment/{courseId}/{assignmentId}");
                        data = "Unexpected httpMethod for /assignment/{courseId}/{assignmentId}";
                        break;
                }
                break;

            // path .../STUDENT_ASSIGNMENT/{studentId}
            case (event.resource === "/student_assignment/{studentId}"): // 'GET' all assignments under student
                switch (true) {
                    case (event.httpMethod === "GET"): // 'GET' all assignments under student (LEFT-PANEL COMPLETED)
                        // Query and Params
                        const stuAssGetAllStuId = event.pathParameters.studentId;
                        const stuAssGetAllQuery = 'SELECT course.course_id, course.name AS course_name, assignment.name AS assignment_name, assignment.description, assignment.assignment_id FROM student_assignment JOIN assignment ON student_assignment.assignment_id = assignment.assignment_id JOIN course ON assignment.course_id = course.course_id WHERE student_assignment.student_id = $1'
                        const studAssGetAllParams = [stuAssGetAllStuId];
                        // Pool and Result
                        result = await pool.query(stuAssGetAllQuery, studAssGetAllParams);
                        data = result.rows;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /student_assignment/{studentId}");
                        data = "Unexpected httpMethod for /student_assignment/{studentId}";
                        break;
                }
                break;

            // path .../STUDENT_ASSIGNMENT/{studentId}/{courseId}
            case (event.resource === "/student_assignment/{studentId}/{courseId}"): // 'GET' student_assignment by course;
                switch (true) {
                    case (event.httpMethod === "GET"):  // 'GET' student_assignment by subjecct (RIGHT-PANEL COMPLETED)
                        // Variables
                        const stuAssGetByCourseStuId = event.pathParameters.studentId;
                        const stuAssGetByCourseCourseId = event.pathParameters.courseId;
                        // Query and Params
                        const stuAssGetByCourseQuery = 'SELECT course.course_id, course.name AS course_name, assignment.name AS assignment_name, assignment.description, assignment.assignment_id FROM student_assignment JOIN assignment ON student_assignment.assignment_id = assignment.assignment_id JOIN course ON assignment.course_id = course.course_id WHERE student_assignment.student_id = $1 AND course.course_id = $2';
                        const stuAssGetByCourseParams = [stuAssGetByCourseStuId, stuAssGetByCourseCourseId];
                        // Pool and Result
                        result = await pool.query(stuAssGetByCourseQuery, stuAssGetByCourseParams);
                        data = result.rows;
                        break;
                    default:
                        console.log("Unexpected httpMethod for /STUDENT_ASSIGNMENT/{studentId}/{courseId}");
                        data = "Unexpected httpMethod for /STUDENT_ASSIGNMENT/{studentId}/{courseId}";
                        break;
                }
                break;

            // path .../STUDENT_ASSIGNMENT/{studentId}/{courseId}/{assignmentId}
            case (event.resource === "/student_assignment/{studentId}/{courseId}/{assignmentId}"): // 'DELETE' a specific student_assignment
                switch (true) {
                    case (event.httpMethod === "DELETE"): // 'DELETE' a specific student_assignment (RIGHT-PANEL COMPLETED)
                        // Variables
                        const stuAssDeleteAssStuId = event.pathParameters.studentId;
                        const stuAssDeleteAssAssId = event.pathParameters.assignmentId;
                        // Query and Params
                        const stuAssDeleteAssQuery = 'DELETE FROM student_assignment WHERE student_id = $1 AND assignment_id = $2';
                        const stuAssDeleteAssParams = [stuAssDeleteAssStuId, stuAssDeleteAssAssId];
                        // Pool and Result
                        await pool.query(stuAssDeleteAssQuery, stuAssDeleteAssParams);
                        data = 'Assignment Deleted From Student Successfully';
                        break;
                    default:
                        console.log("Unexpected httpMethod for /STUDENT_ASSIGNMENT/{studentId}/{courseId}/{assignmentId}");
                        data = "Unexpected httpMethod for /STUDENT_ASSIGNMENT/{studentId}/{courseId}/{assignmentId}";
                        break;
                }
                break;

            // Root Default
            default:
                console.log("Unexpected httpMethod for /");
                data = "Unexpected httpMethod for /}";
                break;
        };

        // Construct Response Object
        const response = {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Origin': '*',
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PATCH,DELETE"
            },
            body: JSON.stringify(data),
        };

        // Return Response
        return response;

    } catch (err) {
        console.log(err);
        return err;
    }
};
