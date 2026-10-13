package com.unlearnarc.user.repository;

import com.unlearnarc.user.entity.UserActivityDay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface UserActivityDayRepository extends JpaRepository<UserActivityDay, String> {

    boolean existsByUserIdAndActivityDate(String userId, LocalDate activityDate);

    /** All activity days for a user within [from, to] inclusive, oldest first. */
    @Query("""
            SELECT d.activityDate FROM UserActivityDay d
            WHERE d.userId = :userId
              AND d.activityDate BETWEEN :from AND :to
            ORDER BY d.activityDate ASC
            """)
    List<LocalDate> findDatesInRange(@Param("userId") String userId,
                                     @Param("from")   LocalDate from,
                                     @Param("to")     LocalDate to);
}
