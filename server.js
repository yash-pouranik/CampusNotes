const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// **Important: Use express-ejs-layouts middleware before routes**
app.use(expressLayouts);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("home/index", { title: "CampusNotes" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
