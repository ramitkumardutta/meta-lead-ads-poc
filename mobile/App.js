
import React, { useEffect, useState } from "react";

import {
    View,
    Text,
    StyleSheet,
    ScrollView
} from "react-native";

import { io } from "socket.io-client";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function App() {

    const [connected, setConnected] = useState(false);
    const [leads, setLeads] = useState([]);

    useEffect(() => {

        const socket = io(API_URL, {
            transports: ["websocket"]
        });

        socket.on("connect", () => {
            console.log("Connected:", socket.id);
            setConnected(true);
        });

        socket.on("disconnect", () => {
            console.log("Disconnected");
            setConnected(false);
        });

        // Receive a new lead from backend
        socket.on("lead:new", (lead) => {
            console.log("New lead received:", lead);

            setLeads((previousLeads) => [
                lead,
                ...previousLeads
            ]);
        });

        return () => {
            socket.disconnect();
        };

    }, []);

    return (
        <View style={styles.container}>

            <Text style={styles.title}>
                Meta Lead Dashboard
            </Text>

            <Text style={styles.status}>
                Status: {connected ? "Connected" : "Disconnected"}
            </Text>

            <Text style={styles.count}>
                Total Leads: {leads.length}
            </Text>

            <ScrollView style={styles.leadList}>

                {leads.length === 0 ? (

                    <Text style={styles.emptyText}>
                        No leads received yet.
                    </Text>

                ) : (

                    leads.map((lead) => (
                        <View key={lead.id} style={styles.card}>
                            
                          <View key={lead.id} style={styles.card}>

                              {Object.entries(lead.fields).map(([key, value]) => (

                                  <View key={key} style={styles.fieldRow}>

                                      <Text style={styles.fieldLabel}>
                                          {key.replace(/_/g, " ").toUpperCase()}
                                      </Text>

                                      <Text style={styles.details}>
                                          {Array.isArray(value) ? value.join(", ") : String(value)}
                                      </Text>

                                  </View>

                              ))}

                          </View>

                        </View>
                    ))

                )}

            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        paddingTop: 65,
        paddingHorizontal: 20
    },

    title: {
        fontSize: 25,
        fontWeight: "bold",
        marginBottom: 15
    },

    status: {
        fontSize: 16,
        marginBottom: 20,
        color: "green"
    },

    count: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 15
    },

    leadList: {
        flex: 1
    },

    emptyText: {
        fontSize: 16,
        color: "gray",
        textAlign: "center",
        marginTop: 50
    },

    card: {
        backgroundColor: "white",
        padding: 18,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 3
    },

    name: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 8
    },

    details: {
        fontSize: 14,
        color: "#555",
        marginBottom: 5
    },

    fieldRow: {
        marginBottom: 10
    },

    fieldLabel: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#888",
        marginBottom: 3
    },

});
