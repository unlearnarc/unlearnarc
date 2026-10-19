package com.unlearnarc.user;

import com.unlearnarc.user.entity.User;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ProfileSharingSchemaUpdateTest {
    @Test
    void startupUpdatesLegacySchemaAndPreservesStudentsAcrossRestarts() throws Exception {
        String url = "jdbc:h2:mem:profile_upgrade_" + UUID.randomUUID()
                + ";MODE=MySQL;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE";
        String studentId;
        try (SessionFactory factory = schema(url, "create")) {
            try (var session = factory.openSession()) {
                var transaction = session.beginTransaction();
                User student = User.builder().name("Existing student")
                        .email("existing@example.test").points(125L).build();
                session.persist(student);
                transaction.commit();
                studentId = student.getId();
            }
        }
        // Reproduce the user schema before V13 without changing existing data.
        try (var connection = DriverManager.getConnection(url, "sa", "");
             var statement = connection.createStatement()) {
            statement.execute("ALTER TABLE `user` DROP COLUMN profile_share_token");
            statement.execute("ALTER TABLE `user` DROP COLUMN last_seen_rank");
        }
        for (int restart = 0; restart < 2; restart++) {
            try (SessionFactory factory = schema(url, "update")) {
                try (var session = factory.openSession()) {
                    User student = session.find(User.class, studentId);
                    assertEquals("Existing student", student.getName());
                    assertEquals(125L, student.getPoints());
                    assertNull(student.getProfileShareToken());
                    assertNull(student.getLastSeenRank());
                }
                try (var connection = DriverManager.getConnection(url, "sa", "");
                     var indexes = connection.getMetaData().getIndexInfo(
                             null, null, "user", true, false)) {
                    boolean uniqueToken = false;
                    while (indexes.next()) {
                        if ("PROFILE_SHARE_TOKEN".equalsIgnoreCase(indexes.getString("COLUMN_NAME"))) {
                            uniqueToken = true;
                        }
                    }
                    assertTrue(uniqueToken, "Startup must create a unique sharing-token index");
                }
            }
        }
    }

    private SessionFactory schema(String url, String mode) {
        return new Configuration().addAnnotatedClass(User.class)
                .setProperty("hibernate.connection.driver_class", "org.h2.Driver")
                .setProperty("hibernate.connection.url", url)
                .setProperty("hibernate.connection.username", "sa")
                .setProperty("hibernate.connection.password", "")
                .setProperty("hibernate.hbm2ddl.auto", mode)
                .setProperty("hibernate.hbm2ddl.halt_on_error", "true")
                .buildSessionFactory();
    }
}
