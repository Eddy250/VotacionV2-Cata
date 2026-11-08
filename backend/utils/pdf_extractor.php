<?php
// utils/pdf_extractor.php - Extractor de PDF y Asistente Electoral 100% Local y Gratuito

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../models.php';

class PdfExtractor {

    /**
     * Extrae texto de un archivo PDF utilizando métodos locales puros
     */
    public static function extract_text($filePath) {
        if (!file_exists($filePath)) {
            return '';
        }

        // 1. Intentar con pdftotext (Poppler Linux)
        if (function_exists('exec')) {
            $cmd = "pdftotext -enc UTF-8 " . escapeshellarg($filePath) . " - 2>/dev/null";
            @exec($cmd, $output, $returnVar);
            if ($returnVar === 0 && !empty($output)) {
                $text = implode("\n", $output);
                if (trim($text) !== '') {
                    return self::clean_text($text);
                }
            }
        }

        // 2. Extractor binario nativo en PHP puro (descomprime streams zlib / FlateDecode)
        $content = @file_get_contents($filePath);
        if (!$content) {
            return '';
        }

        $text = self::parse_pdf_binary($content);
        return self::clean_text($text);
    }

    /**
     * Parser nativo de streams PDF para extraer contenido textual
     */
    private static function parse_pdf_binary($content) {
        $extractedText = '';

        preg_match_all('/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/m', $content, $streamMatches, PREG_OFFSET_CAPTURE);

        if (empty($streamMatches[1])) {
            return '';
        }

        foreach ($streamMatches[1] as $idx => $match) {
            $streamData = $match[0];
            $streamOffset = $match[1];

            $dictSub = substr($content, max(0, $streamOffset - 300), 300);
            $isFlate = (stripos($dictSub, 'FlateDecode') !== false || stripos($dictSub, '/Fl') !== false);

            $data = $streamData;
            if ($isFlate) {
                $uncompressed = @gzuncompress($data);
                if ($uncompressed === false) {
                    $uncompressed = @gzinflate($data);
                }
                if ($uncompressed === false) {
                    $uncompressed = @gzinflate(substr($data, 2));
                }
                if ($uncompressed !== false) {
                    $data = $uncompressed;
                }
            }

            if (strpos($data, 'BT') !== false) {
                if (preg_match_all('/\((.*?)\)\s*Tj/s', $data, $tjMatches)) {
                    foreach ($tjMatches[1] as $t) {
                        $extractedText .= self::decode_pdf_string($t) . " ";
                    }
                }

                if (preg_match_all('/\[(.*?)\]\s*TJ/s', $data, $arrayMatches)) {
                    foreach ($arrayMatches[1] as $arr) {
                        if (preg_match_all('/\((.*?)\)/s', $arr, $subT)) {
                            foreach ($subT[1] as $st) {
                                $extractedText .= self::decode_pdf_string($st);
                            }
                            $extractedText .= " ";
                        }
                    }
                }

                if (preg_match_all('/\((.*?)\)\s*[\'"]/s', $data, $quoteMatches)) {
                    foreach ($quoteMatches[1] as $t) {
                        $extractedText .= "\n" . self::decode_pdf_string($t) . "\n";
                    }
                }
                $extractedText .= "\n";
            }
        }

        return $extractedText;
    }

    private static function decode_pdf_string($str) {
        $str = str_replace(
            ['\\n', '\\r', '\\t', '\\b', '\\f', '\\(', '\\)', '\\\\'],
            ["\n", "\r", "\t", "", "", "(", ")", "\\"],
            $str
        );
        $str = preg_replace_callback('/\\\\([0-7]{1,3})/', function ($m) {
            return chr(octdec($m[1]));
        }, $str);
        return $str;
    }

    private static function clean_text($text) {
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[ \t]+/', ' ', $text);
        return trim($text);
    }

    /**
     * Analiza el texto extraído y lo cruza con el padrón electoral escolar
     */
    public static function analyze_document($rawText) {
        global $pdo;

        $resultado = [
            'nombre' => '',
            'slogan' => '',
            'propuestas' => '',
            'sede' => null,
            'sede_detectada' => false,
            'alumnos_detectados' => [],
            'raw_preview' => mb_substr($rawText, 0, 500)
        ];

        if (trim($rawText) === '') {
            return $resultado;
        }

        // 1. Detectar Nombre de la Lista (soporta misma línea O siguiente línea)
        if (preg_match('/(?:LISTA\s*CANDIDATA|NOMBRE\s*DE\s*LA\s*LISTA)[:\s\|\-]+[\r\n\s]*([^\r\n]+)/iu', $rawText, $nm)) {
            $nom = trim($nm[1], " \t\n\r\0\x0B|:-, ");
            if (mb_strlen($nom) >= 3 && mb_strlen($nom) <= 120 && !preg_match('/^(?:datos|junta|propuesta|eslogan|lema)/iu', $nom)) {
                $resultado['nombre'] = $nom;
            }
        }

        // 2. Detectar Eslogan (soporta misma línea O siguiente línea)
        if (preg_match('/(?:ESLOGAN|LEMA(?:\s*DE\s*CAMPAÑA)?)[:\s\|\-]+[\r\n\s]*["«“]?([^"»”\r\n]+)["»”]?/iu', $rawText, $sm)) {
            $slog = trim($sm[1], " \t\n\r\0\x0B|:-, \"«»“”");
            if (mb_strlen($slog) >= 5 && mb_strlen($slog) <= 150) {
                $resultado['slogan'] = $slog;
            }
        }
        if (!$resultado['slogan'] && preg_match('/["«“]([^\r\n]{10,120})["»”]/u', $rawText, $qm)) {
            $resultado['slogan'] = trim($qm[1]);
        }

        // 3. Detectar Propuestas con Aislamiento Estricto de la Sección III
        $propuestasList = [];
        if (preg_match('/(?:III\.\s*PROPUESTAS[^\n]*|PROPUESTAS\s*PRINCIPALES[^\n]*)([\s\S]*?)(?:Colegio\s+Adventista|P[aá]gina|\Z)/iu', $rawText, $pm)) {
            $bloquePropuestas = trim($pm[1]);
            $bloquePropuestas = str_replace(["\r\n", "\r"], "\n", $bloquePropuestas);

            // Dividir por párrafos o viñetas
            $parrafos = preg_split('/\n{2,}|\n(?=[•\-\*]|\b[A-ZÁÉÍÓÚ][a-zñáéíóú\s]{3,40}:)/u', $bloquePropuestas);

            foreach ($parrafos as $p) {
                $p = trim(preg_replace('/\s+/', ' ', $p));
                $p = preg_replace('/^[•\-\*]\s*/u', '', $p);
                if (mb_strlen($p) > 15 && !preg_match('/^(?:p[aá]gina|comit[eé]\s+electoral|colegio\s+adventista)/iu', $p)) {
                    $propuestasList[] = "• " . $p;
                }
            }
        }

        // Fallback para viñetas en caso de que no tenga título romano "III."
        if (empty($propuestasList)) {
            $lines = array_map('trim', explode("\n", $rawText));
            $enSeccion = false;
            foreach ($lines as $line) {
                if (preg_match('/(?:PROPUESTAS|EJES DE GESTI[OÓ]N)\b/iu', $line)) {
                    $enSeccion = true;
                    continue;
                }
                if ($enSeccion && preg_match('/^[•\-\*]\s*(.+)/u', $line, $lm)) {
                    $propuestasList[] = "• " . trim($lm[1]);
                }
            }
        }

        if (!empty($propuestasList)) {
            $resultado['propuestas'] = implode("\n", array_slice($propuestasList, 0, 10));
        }

        // 4. Detección Directa de Cargos (Tablas y Ficticios)
        $detectadosDirectos = [];
        $rolesPatterns = [
            'alcalde' => '/(?:alcalde(?:sa)?(?:\(sa\))?)[\s:\|\t]+([A-Za-zÁ-Úá-úñÑ\s,\.]+?)(?:\s*[:\|\t\r\n]+\s*(\d{7,8})|\r?\n|$)/iu',
            'teniente' => '/(?:teniente\s*alcalde(?:sa)?(?:\(sa\))?)[\s:\|\t]+([A-Za-zÁ-Úá-úñÑ\s,\.]+?)(?:\s*[:\|\t\r\n]+\s*(\d{7,8})|\r?\n|$)/iu',
            'regidor_educacion' => '/(?:regidor(?:a)?(?:\(a\))?\s*(?:de\s*)?educaci[oó]n)[\s:\|\t]+([A-Za-zÁ-Úá-úñÑ\s,\.]+?)(?:\s*[:\|\t\r\n]+\s*(\d{7,8})|\r?\n|$)/iu',
            'regidor_salud' => '/(?:regidor(?:a)?(?:\(a\))?\s*(?:de\s*)?salud)[\s:\|\t]+([A-Za-zÁ-Úá-úñÑ\s,\.]+?)(?:\s*[:\|\t\r\n]+\s*(\d{7,8})|\r?\n|$)/iu',
            'regidor_derechos' => '/(?:regidor(?:a)?(?:\(a\))?\s*(?:de\s*)?derechos)[\s:\|\t]+([A-Za-zÁ-Úá-úñÑ\s,\.]+?)(?:\s*[:\|\t\r\n]+\s*(\d{7,8})|\r?\n|$)/iu',
        ];

        foreach ($rolesPatterns as $roleKey => $pattern) {
            if (preg_match($pattern, $rawText, $pm)) {
                $nombreDetectado = trim($pm[1]);
                $nombreDetectado = trim(preg_replace('/^(?:apellidos\s*y\s*nombres|nombres|cargo)[:\s\|\-]+/iu', '', $nombreDetectado));
                $nombreDetectado = trim($nombreDetectado, " \t\n\r\0\x0B|:-,");

                if (mb_strlen($nombreDetectado) >= 3 && !preg_match('/^(?:cargo|apellidos|dni|nombres)$/iu', $nombreDetectado)) {
                    $dniDetectado = isset($pm[2]) ? trim($pm[2]) : '';
                    if (!$dniDetectado && preg_match('/' . preg_quote($nombreDetectado, '/') . '[\s:\|\t]+(\d{7,8})/iu', $rawText, $dm)) {
                        $dniDetectado = $dm[1];
                    }

                    $detectadosDirectos[$roleKey] = [
                        'codigo' => $dniDetectado ?: uniqid('cand_'),
                        'dni' => $dniDetectado,
                        'nombre' => $nombreDetectado,
                        'grado' => 'Detectado en documento',
                        'rol_sugerido' => $roleKey,
                        'verificado_padron' => false
                    ];
                }
            }
        }

        // 5. Cruce con el Padrón de Alumnos del Colegio (Tabla voters)
        try {
            $stmt = $pdo->query('SELECT codigo, dni, nombre, ap_paterno, ap_materno, nombres, grado, seccion, ngs, sede FROM voters');
            $voters = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Validar los detectados
            foreach ($detectadosDirectos as $k => $det) {
                foreach ($voters as $v) {
                    $normPadron = self::normalize($v['nombre']);
                    $normDet = self::normalize($det['nombre']);
                    if ($normPadron === $normDet || (!empty($det['dni']) && $det['dni'] === $v['dni'])) {
                        $detectadosDirectos[$k]['nombre'] = $v['nombre'];
                        $detectadosDirectos[$k]['dni'] = $v['dni'];
                        $detectadosDirectos[$k]['grado'] = trim(($v['grado'] ?? '') . ' ' . ($v['seccion'] ?? '') . ' ' . ($v['ngs'] ?? ''));
                        $detectadosDirectos[$k]['verificado_padron'] = true;
                        break;
                    }
                }
            }

            // Buscar otros alumnos del padrón si faltan roles
            $normalRaw = self::normalize($rawText);
            foreach ($voters as $v) {
                $dni = trim($v['dni'] ?? '');
                $codigo = trim($v['codigo'] ?? '');
                $nombreCompleto = trim($v['nombre'] ?? '');
                $apPaterno = trim($v['ap_paterno'] ?? '');
                $nombres = trim($v['nombres'] ?? '');

                $encontrado = false;
                $posMatch = -1;

                if ($dni !== '' && strlen($dni) >= 7 && strpos($rawText, $dni) !== false) {
                    $encontrado = true;
                    $posMatch = strpos($rawText, $dni);
                }

                if (!$encontrado && $apPaterno !== '' && $nombres !== '') {
                    $patron1 = self::normalize($apPaterno . " " . $nombres);
                    if (strpos($normalRaw, $patron1) !== false) {
                        $encontrado = true;
                        $posMatch = strpos($normalRaw, $patron1);
                    }
                }

                if ($encontrado) {
                    $antes = mb_substr($normalRaw, max(0, $posMatch - 80), min(80, $posMatch));
                    $despues = mb_substr($normalRaw, $posMatch, 80);
                    $contextoInmediato = $antes . " " . $despues;

                    $rol = 'regidor';
                    if (preg_match('/TENIENTE/u', $antes) || preg_match('/TENIENTE/u', $despues)) {
                        $rol = 'teniente';
                    } elseif (preg_match('/(?:ALCALDE|ALCALDESA)\b/u', $antes) || preg_match('/(?:ALCALDE|ALCALDESA)\b/u', $despues)) {
                        $rol = 'alcalde';
                    } elseif (preg_match('/(?:EDUCACION|DEPORTE|CULTURA)/u', $contextoInmediato)) {
                        $rol = 'regidor_educacion';
                    } elseif (preg_match('/(?:SALUD|AMBIENTE|ECOLOGIA)/u', $contextoInmediato)) {
                        $rol = 'regidor_salud';
                    } elseif (preg_match('/(?:EMPRENDIMIENTO|ACTIVIDADES?\s*PRODUCTIVAS?)/u', $contextoInmediato)) {
                        $rol = 'regidor_emprendimiento';
                    } elseif (preg_match('/(?:DERECHO|NINO|NINA|ADOLESC)/u', $contextoInmediato)) {
                        $rol = 'regidor_derechos';
                    } elseif (preg_match('/(?:COMUNICACION|TECNOLOG|INFORMACION|TICS?)/u', $contextoInmediato)) {
                        $rol = 'regidor_comunicacion';
                    }

                    if (!isset($detectadosDirectos[$rol])) {
                        $detectadosDirectos[$rol] = [
                            'codigo' => $codigo,
                            'dni' => $dni,
                            'nombre' => $nombreCompleto,
                            'grado' => trim(($v['grado'] ?? '') . ' ' . ($v['seccion'] ?? '') . ' ' . ($v['ngs'] ?? '')),
                            'rol_sugerido' => $rol,
                            'verificado_padron' => true
                        ];
                    }
                }
            }

        } catch (Exception $e) {
            // Silencioso
        }

        $ordenRoles = ['alcalde' => 1, 'teniente' => 2, 'regidor_educacion' => 3, 'regidor_salud' => 4, 'regidor_derechos' => 5, 'regidor' => 6];
        $listaFinal = array_values($detectadosDirectos);
        usort($listaFinal, function ($a, $b) use ($ordenRoles) {
            $ra = $ordenRoles[$a['rol_sugerido']] ?? 9;
            $rb = $ordenRoles[$b['rol_sugerido']] ?? 9;
            return $ra <=> $rb;
        });

        $resultado['alumnos_detectados'] = $listaFinal;

        return $resultado;
    }

    private static function normalize($str) {
        $str = mb_strtoupper($str, 'UTF-8');
        $trans = [
            'Á' => 'A', 'É' => 'E', 'Í' => 'I', 'Ó' => 'O', 'Ú' => 'U',
            'À' => 'A', 'È' => 'E', 'Ì' => 'I', 'Ò' => 'O', 'Ù' => 'U',
            'Ä' => 'A', 'Ë' => 'E', 'Ï' => 'I', 'Ö' => 'O', 'Ü' => 'U',
            'Ñ' => 'N'
        ];
        $str = strtr($str, $trans);
        $str = preg_replace('/[^A-Z0-9\s]/', ' ', $str);
        $str = preg_replace('/\s+/', ' ', $str);
        return trim($str);
    }
}
