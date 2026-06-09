package com.dulcebom.controller;

import com.dulcebom.model.Usuario;
import com.dulcebom.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Controller
public class RecuperarController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public RecuperarController(UsuarioRepository usuarioRepository,
                               PasswordEncoder passwordEncoder,
                               JavaMailSender mailSender) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
    }

    @GetMapping("/recuperar")
    public String recuperarPage() {
        return "recuperar";
    }

    @PostMapping("/recuperar/solicitar")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> solicitarReset(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", "").trim();

        Optional<Usuario> opt = usuarioRepository.findByEmail(email);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", false,
                "message", "No existe una cuenta con ese email."));
        }

        Usuario usuario = opt.get();
        String token = UUID.randomUUID().toString();
        usuario.setResetToken(token);
        usuario.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        usuarioRepository.save(usuario);

        String link = baseUrl + "/recuperar/nueva-contrasena?token=" + token;
        enviarCorreo(email, usuario.getNombre(), link);

        return ResponseEntity.ok(Map.of("success", true,
            "message", "Revisa tu correo. Te enviamos el enlace para restablecer tu contraseña."));
    }

    @GetMapping("/recuperar/nueva-contrasena")
    public String nuevaContrasenaPage(@RequestParam String token, Model model) {
        Optional<Usuario> opt = usuarioRepository.findByResetToken(token);

        if (opt.isEmpty() || opt.get().getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            model.addAttribute("error", "El enlace expiró o no es válido. Solicita uno nuevo.");
            model.addAttribute("token", "");
        } else {
            model.addAttribute("error", "");
            model.addAttribute("token", token);
        }
        return "nueva-contrasena";
    }

    @PostMapping("/recuperar/guardar")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> guardarNuevaContrasena(
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {

        String token       = body.getOrDefault("token", "");
        String newPassword = body.getOrDefault("newPassword", "");

        if (newPassword.length() < 6) {
            return ResponseEntity.ok(Map.of("success", false,
                "message", "La contraseña debe tener al menos 6 caracteres."));
        }

        Optional<Usuario> opt = usuarioRepository.findByResetToken(token);
        if (opt.isEmpty()) {
            return ResponseEntity.ok(Map.of("success", false, "message", "Token inválido."));
        }

        Usuario usuario = opt.get();
        if (usuario.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.ok(Map.of("success", false,
                "message", "El enlace expiró. Solicita uno nuevo."));
        }

        usuario.setPassword(passwordEncoder.encode(newPassword));
        usuario.setResetToken(null);
        usuario.setResetTokenExpiry(null);
        usuarioRepository.save(usuario);

        // Auto-login después de cambiar contraseña
        String role = usuario.getRole() != null ? usuario.getRole() : "user";
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
            usuario.getEmail(), null,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
        HttpSession session = request.getSession(true);
        session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        return ResponseEntity.ok(Map.of("success", true,
            "message", "¡Contraseña actualizada! Entrando al sistema..."));
    }

    private void enviarCorreo(String para, String nombre, String link) {
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromEmail);
        msg.setTo(para);
        msg.setSubject("Dulce Bom – Restablecer contraseña");
        msg.setText(
            "Hola " + nombre + ",\n\n" +
            "Recibimos una solicitud para restablecer tu contraseña.\n\n" +
            "Haz clic en el siguiente enlace (válido por 1 hora):\n" +
            link + "\n\n" +
            "Si no solicitaste esto, ignora este correo.\n\n" +
            "— Dulce Bom"
        );
        mailSender.send(msg);
    }
}