const express = require("express");
const path = require("path");
const app = express();

// Serve the entire /output directory under /images
app.use("/images", express.static(path.join(__dirname, "output")));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
