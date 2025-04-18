package com.IMJM.admin.repository;

import com.IMJM.common.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByReservation_Stylist_Salon_id(String salonId);
}
