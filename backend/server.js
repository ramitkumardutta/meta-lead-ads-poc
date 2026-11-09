
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

app.use(express.json());

// Normal HTTP routes
app.get("/", (req, res) => {
    res.send("Meta Lead Ads Backend is running!");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is healthy"
    });
});

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO to HTTP server
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Handle client connections
io.on("connection", (socket) => {

    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });

});

// Test route: send an event to connected clients
app.get("/api/test-event", (req, res) => {

    const data = {
        message: "Hello from Node.js Backend!",
        time: new Date().toLocaleTimeString()
    };

    io.emit("server:message", data);

    res.status(200).json({
        success: true,
        message: "Event emitted successfully"
    });

});



function formatMetaLead(metaLead) {

    const fields = {};

    metaLead.field_data.forEach((field) => {

        fields[field.name] = field.values.length === 1
            ? field.values[0]
            : field.values;

    });

    return {
        id: metaLead.id,
        fields: fields,
        createdAt: metaLead.created_time
            ? new Date(metaLead.created_time).toISOString()
            : new Date().toISOString()
    };

}


async function fetchMetaLead(leadId) {

    const apiVersion = process.env.META_API_VERSION;
    const accessToken = process.env.META_PAGE_ACCESS_TOKEN;

    if (!apiVersion || !accessToken) {
        throw new Error("Meta API credentials are missing");
    }

    const url =
        `https://graph.facebook.com/${apiVersion}/${leadId}` +
        `?fields=id,created_time,form_id,field_data` +
        `&access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Meta Graph API error: ${JSON.stringify(data)}`
        );
    }

    return data;
}



// Meta Webhook Verification
app.get("/webhook", (req, res) => {

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (
        mode === "subscribe" &&
        token === process.env.META_VERIFY_TOKEN
    ) {
        console.log("Meta webhook verified successfully!");

        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);

});


// Receive Meta Webhook Notifications

app.post("/webhook", (req, res) => {

    console.log("Meta webhook notification received:");

    console.log(JSON.stringify(req.body, null, 2));

    // Acknowledge Meta immediately
    res.sendStatus(200);

    // Process the notification after acknowledging it
    (async () => {

        try {

            const entries = req.body.entry || [];

            for (const entry of entries) {

                const changes = entry.changes || [];

                for (const change of changes) {

                    // We only process new lead notifications
                    if (change.field !== "leadgen") {
                        continue;
                    }

                    const leadId = change.value.leadgen_id;

                    if (!leadId) {
                        console.log("No leadgen_id found");
                        continue;
                    }

                    console.log("New Meta Lead ID:", leadId);

                    // Fetch actual lead details from Meta
                    const metaLead = await fetchMetaLead(leadId);

                    console.log("Fetched Meta Lead:", metaLead);

                    // Convert Meta data into our application format
                    const lead = formatMetaLead(metaLead);

                    // Send actual lead to connected mobile devices
                    io.emit("lead:new", lead);

                    console.log("Lead sent to mobile app:", lead.id);

                }

            }

        } catch (error) {

            console.error("Meta lead processing failed:", error.message);

        }

    })();

});



app.post("/api/test-meta-lead", (req, res) => {

    const metaLead = req.body;

    // Validate Meta-style lead data
    if (!metaLead.field_data || !Array.isArray(metaLead.field_data)) {
        return res.status(400).json({
            success: false,
            message: "Invalid Meta lead format"
        });
    }

    // Convert Meta format into our application format
    const lead = formatMetaLead(metaLead);

    // Send converted lead to mobile app
    io.emit("lead:new", lead);

    res.status(200).json({
        success: true,
        message: "Meta-style lead received successfully",
        lead: lead
    });

});


app.post("/api/test-lead", (req, res) => {

    const { fields } = req.body;

    if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
        return res.status(400).json({
            success: false,
            message: "Please provide lead fields"
        });
    }

    const lead = {
        id: Date.now().toString(),
        fields: fields,
        createdAt: new Date().toISOString()
    };

    io.emit("lead:new", lead);

    res.status(200).json({
        success: true,
        message: "Lead sent successfully",
        lead: lead
    });

});




// Start server
const PORT = process.env.PORT || 4000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
