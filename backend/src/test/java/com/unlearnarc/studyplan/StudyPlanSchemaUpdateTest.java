package com.unlearnarc.studyplan;

import com.unlearnarc.user.entity.User;
import com.unlearnarc.course.entity.Course;
import com.unlearnarc.topic.entity.Topic;
import org.hibernate.SessionFactory;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class StudyPlanSchemaUpdateTest {
    @Test void startupAddsStudyTablesAndPreservesExistingAccountsAcrossRestarts() {
        String url="jdbc:h2:mem:study_upgrade_"+UUID.randomUUID()+";MODE=MySQL;DB_CLOSE_DELAY=-1";
        String id;
        try(SessionFactory factory=schema(url,"create",false);var session=factory.openSession()) {
            var tx=session.beginTransaction();
            User student=User.builder().name("Existing learner").email("existing@test.local").points(42L).build();
            session.persist(student);tx.commit();id=student.getId();
        }
        for(int i=0;i<2;i++) try(SessionFactory factory=schema(url,"update",true);var session=factory.openSession()) {
            User student=session.find(User.class,id);
            assertEquals(42L,student.getPoints());
            assertEquals(0L,session.createSelectionQuery("select count(p) from StudyPlan p",Long.class).getSingleResult());
            assertEquals(0L,session.createSelectionQuery("select count(t) from StudyTask t",Long.class).getSingleResult());
        }
    }
    SessionFactory schema(String url,String mode,boolean study) {
        Configuration cfg=new Configuration().addAnnotatedClass(User.class).addAnnotatedClass(Course.class).addAnnotatedClass(Topic.class);
        if(study) cfg.addAnnotatedClass(StudyPlan.class).addAnnotatedClass(StudyTask.class);
        return cfg.setProperty("hibernate.connection.driver_class","org.h2.Driver")
            .setProperty("hibernate.connection.url",url).setProperty("hibernate.connection.username","sa")
            .setProperty("hibernate.connection.password","").setProperty("hibernate.hbm2ddl.auto",mode)
            .setProperty("hibernate.hbm2ddl.halt_on_error","true").buildSessionFactory();
    }
}
