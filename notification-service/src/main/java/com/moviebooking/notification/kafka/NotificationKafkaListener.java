package com.moviebooking.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.moviebooking.notification.enums.NotificationType;
import com.moviebooking.notification.event.NotificationEvent;
import com.moviebooking.notification.exception.InvalidNotificationEventException;
import com.moviebooking.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationKafkaListener {
    private final ObjectMapper mapper;
    private final NotificationService service;
    private final Map<String, NotificationType> topicTypes;

    @KafkaListener(topics = {
            "${notification.kafka.topics.booking-events}",
            "${notification.kafka.topics.booking-confirmed}",
            "${notification.kafka.topics.payment-success}",
            "${notification.kafka.topics.payment-failed}",
            "${notification.kafka.topics.booking-cancelled}",
            "${notification.kafka.topics.refund-initiated}",
            "${notification.kafka.topics.refund-completed}"
    })
    public void notifications(String payload, @Header(KafkaHeaders.RECEIVED_TOPIC) String topic) {
        handle(topicTypes.get(topic), payload);
    }

    private void handle(NotificationType fallbackType, String payload) {
        try {
            NotificationEvent event = mapper.readValue(payload, NotificationEvent.class);
            NotificationType type = fallbackType != null ? fallbackType : typeFromEvent(event);
            log.info("Received {} event eventId={}", type, event.getEventId());
            service.process(type, event);
        } catch (InvalidNotificationEventException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidNotificationEventException("Malformed notification event");
        }
    }

    private NotificationType typeFromEvent(NotificationEvent event) {
        try {
            return NotificationType.valueOf(event.getEventType());
        } catch (Exception e) {
            throw new InvalidNotificationEventException("Unknown notification event type");
        }
    }
}
