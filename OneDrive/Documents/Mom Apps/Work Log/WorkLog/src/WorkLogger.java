import java.io.*;
import java.util.*;


public class WorkLogger {

    // Reads all entries from the log file and returns them as a map
    public static Map<String, WorkLogEntry> readLogFile(File logFile) throws IOException {
        Map<String, WorkLogEntry> logEntries = new LinkedHashMap<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(logFile))) {
            String line;
            WorkLogEntry currentEntry = null;

            while ((line = reader.readLine()) != null) {
                if (line.matches("\\d{2}/\\d{2}/\\d{4}")) { // Matches date format MM/DD/YYYY
                    currentEntry = new WorkLogEntry(line); // Create new entry for the date
                    logEntries.put(line, currentEntry);
                } else if (currentEntry != null) {
                    if (line.startsWith("SOSI:")) {
                        double hours = Double.parseDouble(line.replace("SOSI:", "").trim().replace("hours", "").trim());
                        currentEntry.setSosiHours(hours);
                    } else if (line.startsWith("Lion Bridge:")) {
                        double minutes =  Double.parseDouble(line.replace("Lion Bridge:", "").trim().replace("minutes", "").trim());
                        currentEntry.setLionBridgeMinutes(minutes);
                    }
                }
            }
        }
        return logEntries;
    }

    // Writes the updated log entries back to the log file


    // Updates the existing log entry by parsing and modifying the stored values
    public static void updateLogEntry(Map<String, WorkLogEntry> logEntries, String date, String jobType, int value) {
        if (!logEntries.containsKey(date)) {
            System.out.println("Date not found in log entries.");
            return;
        }
    
        WorkLogEntry entry = logEntries.get(date);
    
        if (jobType.toLowerCase().contains("sosi")) {
            entry.addSosiHours(value); // Add to the existing SOSI hours
        } else if (jobType.toLowerCase().contains("lion") || jobType.toLowerCase().contains("bridge")) {
            entry.addLionBridgeMinutes(value); // Add to the existing Lion Bridge minutes
        }
    
        // Update the entry in the map
        logEntries.put(date, entry); // This ensures the map reflects the changes.
    }
    
    public static void writeLogFile(File logFile, Map<String, WorkLogEntry> logEntries) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(logFile))) {
            for (WorkLogEntry entry : logEntries.values()) {
                writer.write(entry.getDate());
                writer.newLine();
                writer.write("SOSI: " + entry.getSosiHours() + " hours");
                writer.newLine();
                writer.write("Lion Bridge: " + entry.getLionBridgeMinutes() + " minutes");
                writer.newLine();
            }
        }
    }
    }
