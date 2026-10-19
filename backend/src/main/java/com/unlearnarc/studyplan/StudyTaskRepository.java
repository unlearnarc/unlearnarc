package com.unlearnarc.studyplan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface StudyTaskRepository extends JpaRepository<StudyTask, String> {
    List<StudyTask> findByPlanIdOrderByScheduledDateAscRevisionIntervalAscIdAsc(String planId);
}
