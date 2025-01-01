import java.io.*;
import java.util.*;

public class MainProgram {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        // Step 1: Ask for the .txt file directory path
        System.out.println("Enter the path to the .txt file (quotes will be ignored):");
        String filePath = scanner.nextLine().replace("\"", ""); // Remove quotes
        File logFile = new File(filePath);

        // Step 2: Check if the file exists, create it if not
        if (!logFile.exists()) {
            try {
                logFile.createNewFile();
                System.out.println("File created at: " + filePath);
            } catch (IOException e) {
                System.err.println("Error creating file. Please check the path and try again.");
                return;
            }
        }

        // Step 3: Read existing log entries
        Map<String, WorkLogEntry> logEntries;
        try {
            logEntries = WorkLogger.readLogFile(logFile);
        } catch (IOException e) {
            System.err.println("Error reading the log file: " + e.getMessage());
            return;
        }

        // Step 4: Display the menu
        while (true) {
            System.out.println("\nMenu:");
            System.out.println("1. Log Work");
            System.out.println("2. Exit");
            System.out.print("Choose an option: ");
            String choice = scanner.nextLine();

            switch (choice) {
                case "1":
                    logWork(scanner, logFile, logEntries);
                    break;
                case "2":
                    System.out.println("Exiting the program.");
                    return;
                default:
                    System.out.println("Invalid choice. Please try again.");
            }
        }
    }

    private static void logWork(Scanner scanner, File logFile, Map<String, WorkLogEntry> logEntries) {
        System.out.print("Enter the date (MM/DD/YYYY): ");
        String date = scanner.nextLine();

        if (logEntries.containsKey(date)) {
            System.out.println("Date " + date + " found. Do you want to update the entry? (yes/no)");
            if (scanner.nextLine().equalsIgnoreCase("yes")) {
                updateLog(scanner, logEntries, date);
                try {
                    WorkLogger.writeLogFile(logFile, logEntries);
                    System.out.println("Work log updated successfully!");
                } catch (IOException e) {
                    System.err.println("Error writing to the log file: " + e.getMessage());
                }
            }
        } else {
            System.out.println("Date " + date + " not found. Do you want to create a new entry? (yes/no)");
            if (scanner.nextLine().equalsIgnoreCase("yes")) {
                createNewLogEntry(scanner, logEntries, date);
                try {
                    WorkLogger.writeLogFile(logFile, logEntries);
                    System.out.println("New work log created successfully!");
                } catch (IOException e) {
                    System.err.println("Error writing to the log file: " + e.getMessage());
                }
            }
        }
    }

    private static void updateLog(Scanner scanner, Map<String, WorkLogEntry> logEntries, String date) {
        WorkLogEntry entry = logEntries.get(date);

        System.out.print("Enter the job type (SOSI or Lion Bridge): ");
        String jobType = scanner.nextLine().toLowerCase();

        if (jobType.contains("sosi")) {
            System.out.print("Enter additional SOSI worked hours (decimal allowed): ");
            double hours = Double.parseDouble(scanner.nextLine());
            entry.addSosiHours(hours);
        } else if (jobType.contains("lion") || jobType.contains("bridge")) {
            System.out.print("Enter additional Lion Bridge worked minutes (decimal allowed): ");
            double minutes = Double.parseDouble(scanner.nextLine());
            entry.addLionBridgeMinutes(minutes);
        } else {
            System.out.println("Invalid job type. Returning to menu.");
        }
    }

    private static void createNewLogEntry(Scanner scanner, Map<String, WorkLogEntry> logEntries, String date) {
        WorkLogEntry entry = new WorkLogEntry(date);

        System.out.print("Enter the job type (SOSI or Lion Bridge): ");
        String jobType = scanner.nextLine().toLowerCase();

        if (jobType.contains("sosi")) {
            System.out.print("Enter SOSI worked hours (decimal allowed): ");
            double hours = Double.parseDouble(scanner.nextLine());
            entry.addSosiHours(hours);
        } else if (jobType.contains("lion") || jobType.contains("bridge")) {
            System.out.print("Enter Lion Bridge worked minutes (decimal allowed): ");
            double minutes = Double.parseDouble(scanner.nextLine());
            entry.addLionBridgeMinutes(minutes);
        } else {
            System.out.println("Invalid job type. Returning to menu.");
            return;
        }

        logEntries.put(date, entry);
    }
}

