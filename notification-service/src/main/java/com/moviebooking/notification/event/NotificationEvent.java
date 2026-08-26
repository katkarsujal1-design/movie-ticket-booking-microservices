package com.moviebooking.notification.event;
import jakarta.validation.constraints.*; import lombok.*; import java.math.BigDecimal; import java.time.LocalDateTime; import java.util.List;
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder public class NotificationEvent { @NotBlank private String eventId; @NotBlank private String userId; @NotBlank @Email private String userEmail; private String bookingId,movieName,theatreName,status,reason,failureReason; private LocalDateTime showTime,timestamp; private List<String> seats; private BigDecimal amount; }
