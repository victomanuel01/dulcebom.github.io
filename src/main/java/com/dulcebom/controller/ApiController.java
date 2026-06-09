package com.dulcebom.controller;

import com.dulcebom.service.AuthService;
import com.dulcebom.service.CrudService;
import com.dulcebom.service.DataService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.dulcebom.model.Usuario;
import com.dulcebom.repository.UsuarioRepository;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired private AuthService authService;
    @Autowired private CrudService crudService;
    @Autowired private DataService dataService;
    @Autowired private UsuarioRepository usuarioRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }
        String email = auth.getName();
        Optional<Usuario> opt = usuarioRepository.findByEmail(email);
        if (opt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("authenticated", false));
        }
        Usuario u = opt.get();
        String role = u.getRole() != null ? u.getRole() : "admin";
        return ResponseEntity.ok(Map.of(
            "authenticated", true,
            "name", u.getNombre(),
            "email", u.getEmail(),
            "role", role
        ));
    }

    @PostMapping
    public ResponseEntity<?> handle(
            @RequestParam String action,
            @RequestParam(required = false, defaultValue = "{}") String payload,
            @RequestParam(required = false) MultipartFile imagen) {

        try {
            Map<String, Object> d = mapper.readValue(payload, Map.class);
            return switch (action) {
                case "login"             -> authService.login(d);
                case "registerUser"      -> authService.registerUser(d);
                case "recoverPassword"   -> authService.recoverPassword(d);
                case "saveClient"        -> crudService.saveClient(d);
                case "saveOrder"         -> crudService.saveOrder(d);
                case "deleteOrder"       -> crudService.deleteOrder(d);
                case "toggleOrderStatus" -> crudService.toggleOrderStatus(d);
                case "saveProduct"       -> crudService.saveProduct(d, imagen);
                case "deleteProduct"     -> crudService.deleteProduct(d);
                case "saveCustomMessage" -> crudService.saveCustomMessage(d);
                case "loadAllData"       -> dataService.loadAllData();
                case "loadProducts"      -> dataService.loadProducts();
                case "loadAuditLogs"     -> dataService.loadAuditLogs();
                default -> ResponseEntity.badRequest()
                        .body(Map.of("success", false, "message", "Acción inválida"));
            };
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("success", false, "message", "Error: " + e.getMessage()));
        }
    }
}