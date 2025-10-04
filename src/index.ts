const getMessage = (): string => {
    const message: string = "Hello, TypeScript!";
    return message;
}; 

console.log("This is a TypeScript project.");
console.log(getMessage());



import express from "express";

const app = express();

app.get("/hello", (req: express.Request, res: express.Response) => {
  res.send(`
    <p>Hello Srihari, click on the button on below</p>
    <button id="apiBtn">Call API</button>
     <p id="result"></p>
     <script>
      document.getElementById("apiBtn").addEventListener("click", async () => {
        try {
          const response = await fetch("/welcome");
          const data = await response.json();
          document.getElementById("result").innerText = data.message;
        } catch (err) {
          document.getElementById("result").innerText = "Error calling API";
        }
      });
    </script>
  `);
});

app.get("/welcome", (req: express.Request, res: express.Response) => {
  res.send("Welcome to the world of JS/TS");
});

app.listen(3001, () => {
  console.log("Server running at http://localhost:3001");
});