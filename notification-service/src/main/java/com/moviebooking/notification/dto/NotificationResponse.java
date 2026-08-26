package com.moviebooking.notification.dto;
import com.moviebooking.notification.enums.*; import lombok.*; import java.time.LocalDateTime;
@Getter @Builder @AllArgsConstructor public class NotificationResponse {private Long id;private String eventId,userId,bookingId,recipient,subject,message,failureReason;private NotificationType notificationType;private NotificationChannel channel;private NotificationStatus status;private LocalDateTime createdAt,sentAt,readAt;}
