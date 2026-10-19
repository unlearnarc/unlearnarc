package com.unlearnarc.dailyquiz;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DailyItemRepository extends JpaRepository<DailyItem,String> {
    List<DailyItem> findBySessionIdOrderByPosition(String sessionId);
}
