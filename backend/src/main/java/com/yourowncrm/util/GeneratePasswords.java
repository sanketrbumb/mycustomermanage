package com.yourowncrm.util;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GeneratePasswords {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

        String[] users = {"admin", "manager", "staff"};
        String[] passwords = {"admin123", "manager123", "staff123"};

        System.out.println("\n=== COPY THESE SQL STATEMENTS INTO PGADMIN ===\n");

        for (int i = 0; i < users.length; i++) {
            String hash = encoder.encode(passwords[i]);
            System.out.println("UPDATE users SET password_hash = '" + hash + "'");
            System.out.println("WHERE username = '" + users[i] + "'");
            System.out.println("AND tenant_id = 'a0000000-0000-0000-0000-000000000001';\n");
        }

        System.out.println("=== END OF SQL ===\n");
    }
}
