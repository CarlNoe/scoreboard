import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve the entire /output directory under /images
app.use("/images", express.static(path.join(__dirname, "output")));

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
