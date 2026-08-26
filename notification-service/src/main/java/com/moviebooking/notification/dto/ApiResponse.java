package com.moviebooking.notification.dto;
import lombok.*; import java.time.LocalDateTime;
@Getter @AllArgsConstructor public class ApiResponse<T>{private final boolean success;private final String message;private final T data;private final String errorCode;private final LocalDateTime timestamp;public static <T> ApiResponse<T> ok(String m,T d){return new ApiResponse<>(true,m,d,null,LocalDateTime.now());}public static <T> ApiResponse<T> error(String m,String c){return new ApiResponse<>(false,m,null,c,LocalDateTime.now());}}
