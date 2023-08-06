const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.static("public"));

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["POST", "GET", "PUTS", "DELETE"],
    credentials: true,
  })
);

const db = mysql.createConnection({
  host: process.env.REACT_APP_MYSQL_HOST,
  user: process.env.REACT_APP_MYSQL_USER,
  password: process.env.REACT_APP_MYSQL_PASSWORD,
  database: process.env.REACT_APP_MYSQL_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database!");
});

console.log("Database connected:", db.state === "authenticated");

//! STORES IMAGES IN FILE
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "_" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
});

//! VERIFIES USERS LOGGING IN
const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ Error: "You are not authorized" });
  } else {
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
      if (err) return res.json({ Error: "Wrong token" });
      next();
    });
  }
};

app.get("/dashboard", verifyUser, (req, res) => {
  return res.json({ Status: "Success" });
});

//! VERIFIES LOGIN INFO MATCHES THE DB
app.post("/login", (req, res) => {
  const sql = "SELECT * FROM users WHERE email = ? AND password = ?";
  db.query(sql, [req.body.email, req.body.password], (err, result) => {
    if (err) return res.json({ Status: "Error", Error: "Error running query" });
    if (result.length > 0) {
      const id = result[0].id;
      const token = jwt.sign({ id }, "jwt-secret-key", { expiresIn: "1d" });
      res.cookie("token", token);
      return res.json({ Status: "Success" });
    } else {
      return res.json({ Status: "Error", Error: "Wrong email or password" });
    }
  });
});

//! CLEAR COOKIES TO LOGOUT USER
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.json({ Status: "Success" });
});

//! GET EMPLOYEES FROM DB
app.get("/getEmployees", (req, res) => {
  const sql = "SELECT * FROM employees";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Get employee error in query" });
    return res.json({ Status: "Success", Result: result });
    console.log(res.data);
  });
});

//! GETS THE CORRESPONDING INFO FOR UPDATING ON EMPLOYEE
app.get("/get/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM employees WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Error: "Get employee error in query" });
    return res.json({ Status: "Success", Result: result });
  });
});

//! UPDATES THE CORRESPONDING EMPLOYEE
app.put("/update/:id", (req, res) => {
  const id = req.params.id;
  const {
    name,
    email,
    dob,
    phone,
    address,
    city,
    state,
    zip,
    job,
    department,
    manager,
    salary,
    status,
    project,
  } = req.body;

  const sql =
    "UPDATE employees SET name=?, email=?, dob=?, phone=?, address=?, city=?, state=?, zip=?, job=?, department=?, manager=?, salary=?, status=?, project=? WHERE id=?";

  db.query(
    sql,
    [
      name,
      email,
      dob,
      phone,
      address,
      city,
      state,
      zip,
      job,
      department,
      manager,
      salary,
      status,
      project,
      id,
    ],
    (err, result) => {
      if (err) return res.json({ Error: "Update employee error in query" });
      return res.json({ Status: "Success" });
    }
  );
});

//! DELETES THE EMPLOYEE
app.delete("/delete/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM employees WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Error: "Delete employee error in query" });
    return res.json({ Status: "Success" });
  });
});

//! CREATES NEW EMPLOYEE TO BE ADDED TO DB
app.post("/create", upload.single("photo"), (req, res) => {
  const sql =
    "INSERT INTO employees (`name`, `email`, `password`, `dob`, `phone`, `address`, `city`, `state`, `zip`, `job`, `department`, `manager`, `salary`, `status`, `photo`, `project`) VALUES  (?)";
  bcrypt.hash(req.body.password.toString(), 10, (err, hash) => {
    if (err) return res.json({ Error: "Error in hashing password" });
    const values = [
      req.body.name,
      req.body.email,
      hash,
      req.body.dob,
      req.body.phone,
      req.body.address,
      req.body.city,
      req.body.state,
      req.body.zip,
      req.body.job,
      req.body.department,
      req.body.manager,
      req.body.salary,
      req.body.status,
      req.file.filename,
      req.body.project,
    ];
    db.query(sql, [values], (err, result) => {
      if (err) return res.json({ Error: "Inside signup query" });
      return res.json({ Status: "Success" });
    });
  });
});

//! GET PROJECTS FROM DB
app.get("/getProjects", (req, res) => {
  const sql = "SELECT * FROM projects";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Get projects error in query" });
    return res.json({ Status: "Success", Result: result });
  });
});

//! DELETES THE PROJECTS
app.delete("/deleteProjects/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM projects WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Error: "Delete project error in query" });
    return res.json({ Status: "Success" });
  });
});

//! CREATES NEW PROJECT TO BE ADDED TO DB
app.post("/createProject", (req, res) => {
  const sql =
    "INSERT INTO projects (`name`, `desc`, `status`) VALUES (?, ?, ?)";
  const values = [req.body.name, req.body.desc, req.body.status];
  db.query(sql, values, (err, result) => {
    if (err) return res.json({ Error: "Inside project query" });
    return res.json({ Status: "Success" });
  });
});

//! GETS THE CORRESPONDING INFO FOR UPDATING ON PROJECT
app.get("/getProject/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM projects WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Error: "Get project error in query" });
    return res.json({ Status: "Success", Result: result });
  });
});

//! UPDATES THE CORRESPONDING PROJECT
app.put("/updateProject/:id", (req, res) => {
  const id = req.params.id;
  const sql =
    "UPDATE projects SET name = ?, `desc` = ?, status = ? WHERE id = ?";
  const values = [req.body.name, req.body.desc, req.body.status, id];
  db.query(sql, values, (err, result) => {
    if (err) return res.json({ Error: "Update project error in query" });
    return res.json({ Status: "Success" });
  });
});

//! GET TICKETS FROM DB
app.get("/getTickets", (req, res) => {
  const sql = "SELECT * FROM tickets";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Get tickets error in query" });
    return res.json({ Status: "Success", Result: result });
  });
});

//! DELETES THE TICKETS
app.delete("/deleteTickets/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM tickets WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Error: "Delete ticket error in query" });
    return res.json({ Status: "Success" });
  });
});

//! CREATES NEW TICKET TO BE ADDED TO DB
app.post("/createTicket", (req, res) => {
  const sql =
    "INSERT INTO tickets (`title`, `desc`, `priority`, `status`, `assignee`) VALUES (?, ?, ?, ?, ?)";
  const values = [
    req.body.title,
    req.body.desc,
    req.body.priority,
    req.body.status,
    req.body.assignee,
  ];
  db.query(sql, values, (err, result) => {
    if (err) return res.json({ Error: "Inside ticket query" });
    return res.json({ Status: "Success" });
  });
});

//! GETS THE CORRESPONDING INFO FOR UPDATING ON TICKET
app.get("/getTicket/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM tickets WHERE id = ?";
  db.query(sql, [id], (err, result) => {
    if (err) return res.json({ Error: "Get ticket error in query" });
    return res.json({ Status: "Success", Result: result });
  });
});

//! UPDATES THE CORRESPONDING PROJECT
app.put("/updateTicket/:id", (req, res) => {
  const id = req.params.id;
  const { title, desc, priority, status, assignee } = req.body;
  const sql =
    "UPDATE tickets SET title=?, `desc`=?, priority=?, status=?, assignee=? WHERE id=?";
  const values = [title, desc, priority, status, assignee, id];

  db.query(sql, values, (err, result) => {
    if (err) return res.json({ Error: "Update ticket error in query" });
    return res.json({ Status: "Success" });
  });
});

//! COUNTS THE NUMBER OF EMPLOYEES IN DB
app.get("/employeeCount", (req, res) => {
  const sql = "SELECT count(id) AS employee FROM employees";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF PROJECTS IN DB
app.get("/projectCount", (req, res) => {
  const sql = "SELECT count(id) AS project FROM projects";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF TICKETS IN DB
app.get("/ticketCount", (req, res) => {
  const sql = "SELECT count(id) AS ticket FROM tickets";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF FULL-TIME EMPLOYEES
app.get("/fullTimeEmployeeCount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS fullTimeCount FROM employees WHERE status = 'Full-Time'";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF PART-TIME EMPLOYEES
app.get("/partTimeEmployeeCount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS partTimeCount FROM employees WHERE status = 'Part-Time'";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF OPEN PROJECTS
app.get("/openProjectCount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS openProjectCount FROM projects WHERE status = 'In Progress'";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF CLOSED PROJECTS
app.get("/closedProjectCount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS closeProjectCount FROM projects WHERE status = 'To Do'";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF CLOSED TICKETS
app.get("/ticketsToDoCount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS openTicketCount FROM tickets WHERE status = 'Open'";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

//! COUNTS THE NUMBER OF OPEN TICKETS
app.get("/ticketsInProgressCount", (req, res) => {
  const sql =
    "SELECT COUNT(*) AS closedTicketCount FROM tickets WHERE status = 'Close'";
  db.query(sql, (err, result) => {
    if (err) return res.json({ Error: "Error in running query" });
    return res.json(result);
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build/index.html"));
});

const port = process.env.REACT_APP_PORT || 8081;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
