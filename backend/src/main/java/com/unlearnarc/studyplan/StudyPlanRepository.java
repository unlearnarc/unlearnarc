package com.unlearnarc.studyplan;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface StudyPlanRepository extends JpaRepository<StudyPlan, String> {
    Optional<StudyPlan> findByUserId(String userId);
}
