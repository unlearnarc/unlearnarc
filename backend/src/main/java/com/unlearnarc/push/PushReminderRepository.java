package com.unlearnarc.push;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PushReminderRepository extends JpaRepository<PushReminder, String> {
    List<PushReminder> findBySubscriptionId(String subscriptionId);
    void deleteBySubscriptionId(String subscriptionId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from PushReminder r, PushSubscription s where r.subscriptionId = s.id and r.fired = false and r.dueAt <= :now and s.dndUntil <= :now order by r.dueAt")
    List<PushReminder> findDue(@Param("now") long now, org.springframework.data.domain.Pageable page);
}
