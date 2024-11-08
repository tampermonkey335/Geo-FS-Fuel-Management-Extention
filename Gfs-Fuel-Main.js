// ==UserScript==
// @name         Geo-FS Enhanced Fuel Management and Settings Panel
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds fuel management and settings UI to Geo-FS.
// @author       Tampermonkey335
// @match        https://www.geo-fs.com/geofs.php
// @grant        none
// ==/UserScript==

// This is a Javascript script by Tampermonkey335. Please do not distribute, modify and use without permission

(function() {
    'use strict';

    // Object to store aircraft data, keyed by their unique ID
    const aircraftData = {
        '2': { // C172 Skyhawk
            fuelCapacity: 50, // Real-life fuel capacity for C172Skyhawk in gallons
            fuelBurnRates: {
                '10': 4.5,  // Idle power (10% thrust) in G/H
                '65': 8,    // Cruise power (65% thrust) in G/H
                '75': 8.5,  // Cruise power (75% thrust) in G/H
                '100': 9.5  // Full power (100% thrust) in G/H
            }
        },
        // Example placeholder for future aircraft data
        '3': {
            fuelCapacity: 100, // Placeholder value for a different aircraft
            fuelBurnRates: {
                '10': 6.5,   // Idle power in G/H
                '65': 12,    // Cruise power in G/H
                '75': 13,    // Higher cruise power in G/H
                '100': 15    // Full power in G/H
            }
        }
    };

    // Variable to track remaining fuel, initialized dynamically
    let remainingFuel;
    let fuelAlertEnabled = true; // Default state for fuel alert
    let fuelEditEnabled = false; // Default state for fuel edit

    // Function to get fuel burn rate based on thrust percentage for the specific aircraft
    function getFuelBurnRate(thrustPercentage, fuelBurnRates) {
        if (thrustPercentage <= 0.1) {
            return fuelBurnRates['10'];
        } else if (thrustPercentage <= 0.65) {
            return fuelBurnRates['65'];
        } else if (thrustPercentage <= 0.75) {
            return fuelBurnRates['75'];
        } else {
            return fuelBurnRates['100'];
        }
    }

    // Main function to calculate fuel consumption
    function checkFuelConsumption() {
        // Get the current aircraft ID
        let aircraftID = geofs.aircraft.instance.id.toString();

        // Ensure we have data for the current aircraft
        if (!(aircraftID in aircraftData)) {
            console.log("Aircraft data not found for ID:", aircraftID);
            return;
        }

        // Fetch aircraft-specific data
        let aircraftInfo = aircraftData[aircraftID];
        let fuelBurnRates = aircraftInfo.fuelBurnRates;
        let fuelCapacity = aircraftInfo.fuelCapacity;

        // Initialize remaining fuel if undefined
        if (remainingFuel === undefined) {
            remainingFuel = fuelCapacity;
        }

        // Fetch the current RPM and max RPM from GeoFS
        let currentRPM = geofs.aircraft.instance.engine.rpm;
        let maxRPM = geofs.aircraft.instance.definition.maxRPM;

        // Calculate thrust percentage (currentRPM / maxRPM)
        let thrustPercentage = currentRPM / maxRPM;

        // Get the fuel burn rate based on thrust percentage
        let fuelBurnRate = getFuelBurnRate(thrustPercentage, fuelBurnRates); // Gallons per hour (G/H)

        // Calculate fuel used for the current time interval
        let timeInterval = 5; // Time interval in seconds between checks (adjustable)
        let fuelUsed = (fuelBurnRate / 3600) * timeInterval; // Convert G/H to gallons used in the time interval

        // Deduct the fuel used from remaining fuel
        remainingFuel -= fuelUsed;

        // Update fuel progress bar
        updateFuelProgressBar(remainingFuel, fuelCapacity);

        // If fuel is below 5%, alert the user if enabled
        if (fuelAlertEnabled && remainingFuel <= fuelCapacity * 0.05) {
            alert("Fuel is below 5%! Consider landing soon or refueling.");
        }

        // If fuel is exhausted, stop the aircraft
        if (remainingFuel <= 0) {
            remainingFuel = 0; // Prevent negative values
            geofs.aircraft.instance.definition.maxRPM = 0; // Stop the aircraft
            console.log("Fuel exhausted! Aircraft has run out of fuel and is now stopping.");
        } else {
            console.log(`Remaining fuel: ${remainingFuel.toFixed(2)} gallons`);
        }
    }

    // Set up an interval to run the fuel check every few seconds
    setInterval(checkFuelConsumption, 5000); // Run every 5 seconds

    // Create the UI for the settings panel
    function createSettingsPanel() {
        const panel = document.createElement("div");
        panel.id = "fuel-settings-panel";
        panel.className = "geofs-ui-bottom blue-panel";
        panel.style.width = "300px";
        panel.style.height = "auto";
        panel.style.backgroundColor = "#007bff";
        panel.style.color = "white";
        panel.style.padding = "20px";
        panel.style.borderRadius = "15px";
        panel.style.display = "none";
        panel.style.position = "fixed";
        panel.style.top = "50%";
        panel.style.left = "50%";
        panel.style.transform = "translate(-50%, -50%)";
        panel.style.zIndex = "1000";
        panel.style.textAlign = "center";

        // Fuel Progress Bar
        const fuelProgressBar = document.createElement("div");
        fuelProgressBar.style.width = "100%";
        fuelProgressBar.style.height = "20px";
        fuelProgressBar.style.backgroundColor = "#ff0000";
        fuelProgressBar.style.borderRadius = "10px";
        fuelProgressBar.style.position = "relative";

        const fuelRemainingBar = document.createElement("div");
        fuelRemainingBar.id = "fuel-remaining-bar";
        fuelRemainingBar.style.width = "100%";
        fuelRemainingBar.style.height = "100%";
        fuelRemainingBar.style.backgroundColor = "#00ff00";
        fuelRemainingBar.style.borderRadius = "10px";
        fuelRemainingBar.style.position = "absolute";
        fuelRemainingBar.style.top = "0";
        fuelRemainingBar.style.left = "0";
        fuelProgressBar.appendChild(fuelRemainingBar);

        panel.appendChild(fuelProgressBar);

        // Checkbox for Fuel Alert
        const fuelAlertCheckbox = document.createElement("input");
        fuelAlertCheckbox.type = "checkbox";
        fuelAlertCheckbox.checked = fuelAlertEnabled;
        fuelAlertCheckbox.id = "fuel-alert-checkbox";
        fuelAlertCheckbox.style.marginTop = "10px";
        fuelAlertCheckbox.addEventListener("change", () => {
            fuelAlertEnabled = fuelAlertCheckbox.checked;
        });

        const fuelAlertLabel = document.createElement("label");
        fuelAlertLabel.htmlFor = "fuel-alert-checkbox";
        fuelAlertLabel.textContent = "Enable Fuel Alert";
        fuelAlertLabel.style.marginLeft = "5px";

        panel.appendChild(fuelAlertCheckbox);
        panel.appendChild(fuelAlertLabel);

        // Checkbox for Fuel Edit
        const fuelEditCheckbox = document.createElement("input");
        fuelEditCheckbox.type = "checkbox";
        fuelEditCheckbox.checked = fuelEditEnabled;
        fuelEditCheckbox.id = "fuel-edit-checkbox";
        fuelEditCheckbox.style.marginTop = "10px";
        fuelEditCheckbox.style.marginLeft = "20px";
        fuelEditCheckbox.addEventListener("change", () => {
            fuelEditEnabled = fuelEditCheckbox.checked;
        });

        const fuelEditLabel = document.createElement("label");
        fuelEditLabel.htmlFor = "fuel-edit-checkbox";
        fuelEditLabel.textContent = "Enable Fuel Edit";
        fuelEditLabel.style.marginLeft = "5px";

        panel.appendChild(fuelEditCheckbox);
        panel.appendChild(fuelEditLabel);

        const toggleButton = document.createElement("button");
        toggleButton.textContent = "Settings";
        toggleButton.className = "mdl-button mdl-js-button mdl-button--icon";
        toggleButton.style.marginLeft = "10px";
        toggleButton.style.zIndex = "1001";
        toggleButton.addEventListener("click", () => {
            panel.style.display = panel.style.display === "none" ? "block" : "none";
        });

        const geofsBottomUI = document.querySelector('.geofs-ui-bottom');
        if (geofsBottomUI) {
            geofsBottomUI.appendChild(toggleButton);
            geofsBottomUI.appendChild(panel);
        } else {
            document.body.appendChild(toggleButton);
            document.body.appendChild(panel);
        }
    }

    // Function to update the fuel progress bar
    function updateFuelProgressBar(remainingFuel, fuelCapacity) {
        const fuelRemainingBar = document.getElementById("fuel-remaining-bar");
        if (fuelRemainingBar) {
            const fuelPercentage = (remainingFuel / fuelCapacity) * 100;
            fuelRemainingBar.style.width = `${fuelPercentage}%`;
        }
    }

    // Initialize the settings panel
    createSettingsPanel();
})();

// Add CSS for blue panel
const style = document.createElement('style');
style.innerHTML = `
  .blue-panel {
    background-color: #007bff;
    color: white;
    border-radius: 15px;
    padding: 20px;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
`;
document.head.appendChild(style);

/* Data: For devs after some digging lmao:
For starters, the thrust information is achieved from geofs.aircraft.instance.engine.rpm (Take a closer look on geofs.aircraft.instance.engine tho)
It returns a number from 0 to max thrust.
The maximum thrust from which you should fetch from is @ geofs.aircraft.instance.definition.maxRPM

The TAS seems to be stored in geofs.aircraft.instance.trueAirSpeed, however, the value is half of the TAS in the simulator. Also note that .airVelocity[1,2,3] is not the same as .trueAirspeed.
The values are also fetched as numbers.

Additionally, note that the RPM and thrust can also be found in geofs.aircraft.instance.definition.parts[x] where x is the location of the engine object (sometimes 2).
*/
