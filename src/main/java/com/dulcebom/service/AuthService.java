package com.dulcebom.service;

import com.dulcebom.model.Auditoria;
import com.dulcebom.model.Usuario;
import com.dulcebom.repository.AuditoriaRepository;
import com.dulcebom.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired private UsuarioRepository usuarioRepo;
    @Autowired private AuditoriaRepository auditoriaRepo;
    @Autowired private PasswordEncoder passwordEncoder;

    public ResponseEntity<?> login(Map<String, Object> d) {
        String email    = (String) d.getOrDefault("email", "");
        String password = (String) d.getOrDefault("password", "");

        Optional<Usuario> opt = usuarioRepo.findByEmail(email);
        if (opt.isPresent() && passwordEncoder.matches(password, opt.get().getPassword())) {
            Usuario u = opt.get();
            log(u.getNombre(), "Login", "Usuario", "Ingreso exitoso");
            return ResponseEntity.ok(Map.of("success", true,
                    "user", Map.of("name", u.getNombre(), "role", u.getRole() != null ? u.getRole() : "user")));
        }
        return ResponseEntity.ok(Map.of("success", false, "message", "Credenciales incorrectas"));
    }

    public ResponseEntity<?> registerUser(Map<String, Object> d) {
        String nombre   = ((String) d.getOrDefault("name", "")).trim();
        String email    = ((String) d.getOrDefault("email", "")).trim();
        String password = (String) d.getOrDefault("password", "");

        if (nombre.isEmpty() || email.isEmpty() || password.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Rellene todos los campos."));

        if (usuarioRepo.existsByEmail(email))
            return ResponseEntity.status(409).body(Map.of("success", false, "message", "El email ya está registrado."));

        Usuario u = new Usuario();
        u.setNombre(nombre);
        u.setEmail(email);
        u.setPassword(passwordEncoder.encode(password));
        u.setRole("admin");
        usuarioRepo.save(u);

        log("Sistema", "Crear", "Usuario", "Nuevo registro: " + email);
        return ResponseEntity.ok(Map.of("success", true, "message", "Usuario registrado con éxito."));
    }

    public ResponseEntity<?> recoverPassword(Map<String, Object> d) {
        String email   = (String) d.getOrDefault("email", "");
        String newPass = (String) d.getOrDefault("password", "");

        Optional<Usuario> opt = usuarioRepo.findByEmail(email);
        if (opt.isEmpty())
            return ResponseEntity.ok(Map.of("success", false, "message", "Email no encontrado."));

        Usuario u = opt.get();
        u.setPassword(passwordEncoder.encode(newPass));
        usuarioRepo.save(u);
        return ResponseEntity.ok(Map.of("success", true, "message", "Contraseña actualizada."));
    }

    private void log(String usuario, String accion, String entidad, String detalles) {
        Auditoria a = new Auditoria();
        a.setUsuario(usuario); a.setAccion(accion);
        a.setEntidad(entidad); a.setDetalles(detalles);
        auditoriaRepo.save(a);
    }
}
