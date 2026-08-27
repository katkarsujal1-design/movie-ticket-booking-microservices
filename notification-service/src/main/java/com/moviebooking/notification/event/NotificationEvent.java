package com.moviebooking.notification.event;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationEvent {
    @NotBlank private String eventId;
    @NotBlank private String userId;
    @Email private String userEmail;
    private String eventType;
    private String bookingId;
    private String bookingReference;
    private String paymentId;
    private String movieName;
    private String theatreName;
    private String status;
    private String reason;
    private String failureReason;
    private LocalDateTime showTime;
    private LocalDateTime timestamp;
    private List<String> seats;
    private BigDecimal amount;
    private BigDecimal totalAmount;
}
