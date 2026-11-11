<?php
// utils/stats_manager.php - Backend Puente: Métricas y estadísticas avanzadas CATA 2026 (MySQL & SQLite)
require_once __DIR__ . '/../models.php';

class StatsManager {

    /**
     * Calcula estadísticas para una sede específica ('central' o 'jerusalen'), con soporte de nivel escolar
     */
    private static function _calc_single_sede_stats($sedeSlug, $ngs = null, $nivel = null) {
        $whereVoters = [];
        $paramsVoters = [];
        $whereVotos = [];
        $paramsVotos = [];

        $isMysql = (DB_DRIVER === 'mysql');
        $separateDbs = defined('DB_SEPARATE_DBS') && DB_SEPARATE_DBS;

        if ($isMysql && !$separateDbs) {
            $sedePattern = ($sedeSlug === 'jerusalen') ? '%Jerusal%' : '%Central%';
            $whereVoters[] = "(sede LIKE :sede_voters OR sede IS NULL)";
            $paramsVoters['sede_voters'] = $sedePattern;
            $whereVotos[] = "(sede LIKE :sede_votos OR sede IS NULL)";
            $paramsVotos['sede_votos'] = $sedePattern;
        }

        if ($ngs && $ngs !== 'todos') {
            $whereVoters[] = 'ngs = :ngs';
            $paramsVoters['ngs'] = $ngs;
            $whereVotos[] = 'ngs = :ngs';
            $paramsVotos['ngs'] = $ngs;
        } else {
            $whereVoters[] = "(ngs NOT LIKE '%A_OS%' AND ngs NOT LIKE '%INICIAL%')";
        }

        // Filtro por Nivel Escolar en Sede Central (Primaria vs Secundaria)
        if ($sedeSlug === 'central' && $nivel && $nivel !== 'todos') {
            if (strtolower($nivel) === 'secundaria') {
                $whereVoters[] = "(LOWER(nivel) = 'secundaria' OR ((nivel IS NULL OR nivel = '') AND (grado LIKE '%SEC%' OR ngs LIKE '%SEC%' OR ngs LIKE '%AÑO%' OR ngs LIKE '%ANO%')))";
                $whereVotos[] = "(LOWER(nivel) = 'secundaria' OR candidato_id IN (SELECT id FROM candidatos WHERE LOWER(nivel) = 'secundaria'))";
            } elseif (strtolower($nivel) === 'primaria') {
                $whereVoters[] = "(LOWER(nivel) = 'primaria' OR ((nivel IS NULL OR nivel = '') AND (grado NOT LIKE '%SEC%' AND ngs NOT LIKE '%SEC%' AND ngs NOT LIKE '%AÑO%' AND ngs NOT LIKE '%ANO%')))";
                $whereVotos[] = "(LOWER(nivel) = 'primaria' OR candidato_id IN (SELECT id FROM candidatos WHERE LOWER(nivel) = 'primaria'))";
            }
        }

        // Total alumnos
        $sqlTotal = 'SELECT COUNT(*) FROM voters';
        if (!empty($whereVoters)) {
            $sqlTotal .= ' WHERE ' . implode(' AND ', $whereVoters);
        }
        $total_alumnos = (int)db_query($sqlTotal, $paramsVoters, $sedeSlug)->fetchColumn();

        // Total votos emitidos
        $sqlVotos = 'SELECT COUNT(*) FROM votos';
        if (!empty($whereVotos)) {
            $sqlVotos .= ' WHERE ' . implode(' AND ', $whereVotos);
        }
        $votos_emitidos = (int)db_query($sqlVotos, $paramsVotos, $sedeSlug)->fetchColumn();

        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        // Candidatos de esta sede (filtrados por nivel si aplica)
        if ($isMysql && !$separateDbs) {
            $sedePattern = ($sedeSlug === 'jerusalen') ? '%Jerusal%' : '%Central%';
            if ($sedeSlug === 'central' && $nivel && $nivel !== 'todos') {
                $candidatos = db_query(
                    "SELECT id, nombre, foto, logo, color, sede, nivel FROM candidatos 
                     WHERE (sede LIKE :sede_pat OR sede IS NULL OR LOWER(nombre) LIKE '%blanco%' OR LOWER(sede) LIKE '%universal%')
                       AND (LOWER(nivel) = LOWER(:nivel) OR LOWER(nivel) = 'general' OR nivel IS NULL OR nivel = '')
                     ORDER BY id ASC",
                    ['sede_pat' => $sedePattern, 'nivel' => $nivel]
                )->fetchAll();
            } else {
                $candidatos = db_query(
                    "SELECT id, nombre, foto, logo, color, sede, nivel FROM candidatos 
                     WHERE (sede LIKE :sede_pat OR sede IS NULL OR LOWER(nombre) LIKE '%blanco%' OR LOWER(sede) LIKE '%universal%')
                     ORDER BY id ASC",
                    ['sede_pat' => $sedePattern]
                )->fetchAll();
            }
        } else {
            if ($sedeSlug === 'central' && $nivel && $nivel !== 'todos') {
                $candidatos = db_query(
                    "SELECT id, nombre, foto, logo, color, sede, nivel FROM candidatos 
                     WHERE (LOWER(nivel) = LOWER(:nivel) OR LOWER(nivel) = 'general' OR nivel IS NULL OR nivel = '' OR LOWER(nombre) LIKE '%blanco%')
                     ORDER BY id ASC",
                    ['nivel' => $nivel],
                    $sedeSlug
                )->fetchAll();
            } else {
                $candidatos = db_query('SELECT id, nombre, foto, logo, color, sede, nivel FROM candidatos ORDER BY id ASC', [], $sedeSlug)->fetchAll();
            }
        }

        $resultados = [];
        $chart_labels = [];
        $chart_data = [];
        $chart_colors = [];

        $defaultPalette = ['#1B3A8C', '#E11D48', '#F59E0B', '#10B981', '#8B5CF6', '#F97316', '#06B6D4', '#EC4899'];
        $colorIndex = 0;

        foreach ($candidatos as $c) {
            $sqlC = 'SELECT COUNT(*) FROM votos WHERE candidato_id = :cid';
            $paramsC = ['cid' => $c['id']];
            if (!empty($whereVotos)) {
                $sqlC .= ' AND ' . implode(' AND ', $whereVotos);
                $paramsC = array_merge($paramsC, $paramsVotos);
            }

            $votos_c = (int)db_query($sqlC, $paramsC, $sedeSlug)->fetchColumn();
            $pct_c = ($votos_emitidos > 0) ? round(($votos_c / $votos_emitidos) * 100, 1) : 0.0;

            // Determinar color de barra representativo
            $cColor = !empty($c['color']) ? trim($c['color']) : null;
            if (!$cColor) {
                if (stripos($c['nombre'], 'blanco') !== false || stripos($c['nombre'], 'nulo') !== false) {
                    $cColor = '#94A3B8';
                } else {
                    $cColor = $defaultPalette[$colorIndex % count($defaultPalette)];
                    $colorIndex++;
                }
            }

            $resultados[] = [
                'id' => (int)$c['id'],
                'nombre' => $c['nombre'],
                'foto' => $c['foto'],
                'logo' => $c['logo'],
                'color' => $cColor,
                'sede' => normalize_sede_name($sedeSlug),
                'nivel' => $c['nivel'] ?? 'General',
                'votos' => $votos_c,
                'porcentaje' => $pct_c
            ];

            $chart_labels[] = $c['nombre'];
            $chart_data[] = $votos_c;
            $chart_colors[] = $cColor;
        }

        usort($resultados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        return [
            'sede' => normalize_sede_name($sedeSlug),
            'sede_slug' => $sedeSlug,
            'nivel' => $nivel ?: 'todos',
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data,
            'chart_colors' => $chart_colors
        ];
    }

    /**
     * Backend Puente: Obtiene estadísticas con filtros opcionales o consolidado general
     */
    public static function get_dashboard_stats($sede = null, $ngs = null, $nivel = null) {
        $listas = getDistinctSedesAndNGS();

        if ($sede && $sede !== 'todos') {
            $slug = normalize_sede_slug($sede);
            $stats = self::_calc_single_sede_stats($slug, $ngs, $nivel);
            $stats['filtro_actual'] = [
                'sede' => normalize_sede_name($slug),
                'ngs' => $ngs ?: 'todos',
                'nivel' => $nivel ?: 'todos'
            ];
            $stats['sedes_disponibles'] = $listas['sedes'];
            $stats['ngs_disponibles'] = $listas['ngs'];

            // Si es Central y no se solicitó un nivel específico, calcular desglose de ambos niveles
            if ($slug === 'central' && (!$nivel || $nivel === 'todos')) {
                $stats['desglose_niveles'] = [
                    'primaria' => self::_calc_single_sede_stats('central', $ngs, 'Primaria'),
                    'secundaria' => self::_calc_single_sede_stats('central', $ngs, 'Secundaria')
                ];
            }

            return $stats;
        }

        // --- CONSOLIDADO GENERAL PUENTE (AMBAS SEDES) ---
        $centralStats = self::_calc_single_sede_stats('central', $ngs, $nivel);
        $jeruStats = self::_calc_single_sede_stats('jerusalen', $ngs, $nivel);

        $total_alumnos = $centralStats['total_alumnos'] + $jeruStats['total_alumnos'];
        $votos_emitidos = $centralStats['votos_emitidos'] + $jeruStats['votos_emitidos'];
        $porcentaje_participacion = ($total_alumnos > 0) ? round(($votos_emitidos / $total_alumnos) * 100, 1) : 0.0;

        $resultadosConsolidados = array_merge($centralStats['resultados'], $jeruStats['resultados']);
        // Recalcular porcentaje consolidado sobre el total de votos emitidos del consolidado
        foreach ($resultadosConsolidados as &$rc) {
            $rc['porcentaje'] = ($votos_emitidos > 0) ? round(($rc['votos'] / $votos_emitidos) * 100, 1) : 0.0;
        }
        unset($rc);
        usort($resultadosConsolidados, function($a, $b) {
            return $b['votos'] <=> $a['votos'];
        });

        $chart_labels = [];
        $chart_data = [];
        $chart_colors = [];
        foreach ($resultadosConsolidados as $rc) {
            $chart_labels[] = $rc['nombre'] . ' (' . ($rc['sede'] === 'Sede Jerusalén' ? 'Jeru' : 'Cent') . ')';
            $chart_data[] = $rc['votos'];
            $chart_colors[] = $rc['color'] ?? '#1B3A8C';
        }

        return [
            'total_alumnos' => $total_alumnos,
            'votos_emitidos' => $votos_emitidos,
            'porcentaje_participacion' => $porcentaje_participacion,
            'resultados' => $resultadosConsolidados,
            'chart_labels' => $chart_labels,
            'chart_data' => $chart_data,
            'chart_colors' => $chart_colors,
            'sedes_desglose' => [
                'central' => $centralStats,
                'jerusalen' => $jeruStats
            ],
            'filtro_actual' => [
                'sede' => 'todos',
                'ngs' => $ngs ?: 'todos'
            ],
            'sedes_disponibles' => $listas['sedes'],
            'ngs_disponibles' => $listas['ngs']
        ];
    }
}
