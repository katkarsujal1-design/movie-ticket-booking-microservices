package com.moviebooking.notification.service.impl;

import com.moviebooking.notification.dto.NotificationResponse;
import com.moviebooking.notification.entity.Notification;
import com.moviebooking.notification.enums.NotificationChannel;
import com.moviebooking.notification.enums.NotificationStatus;
import com.moviebooking.notification.enums.NotificationType;
import com.moviebooking.notification.event.NotificationEvent;
import com.moviebooking.notification.exception.EmailDeliveryException;
import com.moviebooking.notification.exception.InvalidNotificationEventException;
import com.moviebooking.notification.exception.NotificationNotFoundException;
import com.moviebooking.notification.mapper.NotificationMapper;
import com.moviebooking.notification.repository.NotificationRepository;
import com.moviebooking.notification.service.EmailService;
import com.moviebooking.notification.service.NotificationService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {
    private final NotificationRepository repo;
    private final EmailService email;

    @Transactional
    public void process(NotificationType type, NotificationEvent e) {
        String userId = trim(e.getUserId());
        if (userId == null) {
            throw new InvalidNotificationEventException("userId is required");
        }

        String bookingId = firstPresent(e.getBookingReference(), e.getBookingId());
        String eventId = firstPresent(e.getEventId(), generatedEventId(type, bookingId, e));
        String recipient = firstPresent(e.getUserEmail(), "user" + userId + "@moviebooking.local");

        if (repo.existsByEventId(eventId)) {
            log.info("Duplicate event ignored eventId={}", eventId);
            return;
        }

        Notification n = repo.save(Notification.builder()
                .eventId(eventId)
                .userId(userId)
                .bookingId(bookingId)
                .recipient(recipient)
                .notificationType(type)
                .channel(NotificationChannel.EMAIL)
                .subject(subject(type))
                .message(template(type, e))
                .status(NotificationStatus.PENDING)
                .build());

        try {
            email.send(n);
            n.setStatus(NotificationStatus.SENT);
            n.setSentAt(LocalDateTime.now());
            log.info("Notification sent successfully notificationId={}", n.getId());
        } catch (EmailDeliveryException ex) {
            n.setStatus(NotificationStatus.FAILED);
            n.setFailureReason(ex.getMessage());
            log.warn("Email delivery failed notificationId={}", n.getId());
        }
        repo.save(n);
    }

    private String subject(NotificationType t) {
        return switch (t) {
            case BOOKING_CONFIRMED -> "Your booking is confirmed";
            case PAYMENT_SUCCESS -> "Payment successful";
            case PAYMENT_FAILED -> "Payment failed";
            case BOOKING_CANCELLED -> "Your booking was cancelled";
            case REFUND_INITIATED -> "Your refund has been initiated";
            case REFUND_COMPLETED -> "Your refund is complete";
        };
    }

    private String template(NotificationType t, NotificationEvent e) {
        String details = "Booking ID: " + safe(firstPresent(e.getBookingReference(), e.getBookingId()))
                + "<br/>Amount: " + safe(String.valueOf(amount(e)));
        if (e.getMovieName() != null) {
            details += "<br/>Movie: " + safe(e.getMovieName())
                    + "<br/>Theatre: " + safe(e.getTheatreName())
                    + "<br/>Show time: " + safe(String.valueOf(e.getShowTime()))
                    + "<br/>Seats: " + safe(String.valueOf(e.getSeats()));
        } else if (e.getSeats() != null && !e.getSeats().isEmpty()) {
            details += "<br/>Seats: " + safe(String.valueOf(e.getSeats()));
        }
        if (e.getPaymentId() != null) {
            details += "<br/>Payment ID: " + safe(e.getPaymentId());
        }
        if (e.getReason() != null || e.getFailureReason() != null) {
            details += "<br/>Reason: " + safe(e.getReason() != null ? e.getReason() : e.getFailureReason());
        }
        return "<html><body><p>Hello,</p><p>" + subject(t) + ".</p><p>" + details + "</p><p>Thank you for choosing Movie Booking.</p></body></html>";
    }

    private BigDecimal amount(NotificationEvent e) {
        return e.getAmount() != null ? e.getAmount() : e.getTotalAmount();
    }

    private String generatedEventId(NotificationType type, String bookingId, NotificationEvent e) {
        String id = firstPresent(e.getPaymentId(), bookingId, String.valueOf(e.getTimestamp()));
        return type.name() + "-" + id;
    }

    private String firstPresent(String... values) {
        for (String value : values) {
            String trimmed = trim(value);
            if (trimmed != null) {
                return trimmed;
            }
        }
        return null;
    }

    private String trim(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private String safe(String s) {
        return s == null ? "Not available" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    public Page<NotificationResponse> all(Pageable p) {
        return repo.findAll(p).map(NotificationMapper::toResponse);
    }

    public NotificationResponse one(Long id) {
        return NotificationMapper.toResponse(repo.findById(id).orElseThrow(() -> new NotificationNotFoundException(id)));
    }

    public Page<NotificationResponse> user(String u, Pageable p) {
        return repo.findByUserId(u, p).map(NotificationMapper::toResponse);
    }

    public Page<NotificationResponse> booking(String b, Pageable p) {
        return repo.findByBookingId(b, p).map(NotificationMapper::toResponse);
    }

    public Page<NotificationResponse> unread(String u, Pageable p) {
        return repo.findByUserIdAndReadAtIsNull(u, p).map(NotificationMapper::toResponse);
    }

    @Transactional
    public NotificationResponse markRead(Long id) {
        Notification n = repo.findById(id).orElseThrow(() -> new NotificationNotFoundException(id));
        if (n.getReadAt() == null) {
            n.setReadAt(LocalDateTime.now());
        }
        return NotificationMapper.toResponse(repo.save(n));
    }

    @Transactional
    public int markAllRead(String u) {
        return repo.markAllRead(u);
    }
}
