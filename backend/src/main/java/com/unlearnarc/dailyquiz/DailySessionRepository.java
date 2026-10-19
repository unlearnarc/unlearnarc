package com.unlearnarc.dailyquiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.*;
import java.time.LocalDate;
import java.util.Optional;
public interface DailySessionRepository extends JpaRepository<DailySession,String> {
    Optional<DailySession> findByUserIdAndLearningDate(String userId, LocalDate learningDate);
    Page<DailySession> findByUserIdOrderByLearningDateDesc(String userId, Pageable page);
}
