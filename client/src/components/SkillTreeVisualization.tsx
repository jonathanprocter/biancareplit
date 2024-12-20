import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Lock, CheckCircle } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  level: number;
  mastered: boolean;
  prerequisites: string[];
  category: string;
  description: string;
}

interface Point {
  x: number;
  y: number;
}

interface SkillNode extends Skill {
  x: number;
  y: number;
  velocity: { x: number; y: number };
}

interface SkillTreeVisualizationProps {
  skills: Skill[];
  width?: number;
  height?: number;
}

export function SkillTreeVisualization({
  skills,
  width = 800,
  height = 600,
}: SkillTreeVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  // Initialize nodes with random positions
  useEffect(() => {
    const initialNodes = skills.map(skill => ({
      ...skill,
      x: Math.random() * width,
      y: Math.random() * height,
      velocity: { x: 0, y: 0 },
    }));
    setNodes(initialNodes);
  }, [skills, width, height]);

  // Force-directed graph simulation
  const simulateForces = useCallback(() => {
    setNodes(prevNodes => {
      const newNodes = prevNodes.map(node => ({
        ...node,
        velocity: node.velocity || { x: 0, y: 0 },
      }));

      // Apply forces
      for (let i = 0; i < newNodes.length; i++) {
        const node = newNodes[i];

        // Repulsion between nodes
        for (let j = 0; j < newNodes.length; j++) {
          if (i === j) continue;
          const other = newNodes[j];
          const dx = other.x - node.x;
          const dy = other.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 1) continue;

          const force = Math.min(2000, 1000 / (distance * distance));
          node.velocity.x -= (dx / distance) * force * 0.05;
          node.velocity.y -= (dy / distance) * force * 0.05;
        }

        // Attraction along prerequisites
        node.prerequisites.forEach(prereqId => {
          const prereq = newNodes.find(n => n.id === prereqId);
          if (prereq) {
            const dx = prereq.x - node.x;
            const dy = prereq.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const targetDistance = 150; // Desired distance between connected nodes
            const strength = (distance - targetDistance) * 0.03;
            node.velocity.x += dx * strength;
            node.velocity.y += dy * strength;
          }
        });

        // Center gravity
        const centerForce = 0.005;
        node.velocity.x += (width / 2 - node.x) * centerForce;
        node.velocity.y += (height / 2 - node.y) * centerForce;

        // Apply velocity with damping
        const damping = 0.7;
        node.x += node.velocity.x * damping;
        node.y += node.velocity.y * damping;
        node.velocity.x *= damping;
        node.velocity.y *= damping;

        // Boundary constraints with padding
        const padding = 50;
        node.x = Math.max(padding, Math.min(width - padding, node.x));
        node.y = Math.max(padding, Math.min(height - padding, node.y));
      }

      return newNodes;
    });
  }, [width, height]);

  useEffect(() => {
    let animationFrameId: number;
    let isAnimating = true;

    const animate = () => {
      if (!isAnimating) return;
      simulateForces();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isAnimating = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [simulateForces]);

  const renderConnections = useCallback(() => {
    return nodes
      .flatMap(node =>
        node.prerequisites.map(prereqId => {
          const prereq = nodes.find(n => n.id === prereqId);
          if (!prereq) return null;

          const key = `${node.id}-${prereqId}`;
          const strokeColor = node.mastered ? '#22c55e' : '#94a3b8';

          return (
            <motion.line
              key={key}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: 1,
                x1: prereq.x,
                y1: prereq.y,
                x2: node.x,
                y2: node.y,
              }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              stroke={strokeColor}
              strokeWidth={2}
              strokeDasharray="4"
            />
          );
        })
      )
      .filter(Boolean);
  }, [nodes]);

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="absolute inset-0"
      >
        <g>{renderConnections()}</g>
        {nodes.map(node => (
          <g key={node.id}>
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={30}
              fill={node.mastered ? '#22c55e' : '#94a3b8'}
              opacity={hoveredSkill === node.id ? 0.8 : 0.6}
              whileHover={{ scale: 1.1 }}
              onClick={() => setSelectedSkill(node)}
              onHoverStart={() => setHoveredSkill(node.id)}
              onHoverEnd={() => setHoveredSkill(null)}
            />
            <motion.text
              x={node.x}
              y={node.y + 45}
              textAnchor="middle"
              fill="currentColor"
              className="text-sm font-medium"
            >
              {node.name}
            </motion.text>
          </g>
        ))}
      </svg>

      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 right-4 w-80"
          >
            <Card className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedSkill.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedSkill.description}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedSkill.mastered ? 'success' : 'secondary'}
                  >
                    {selectedSkill.mastered ? (
                      <CheckCircle className="w-4 h-4 mr-1" />
                    ) : (
                      <Lock className="w-4 h-4 mr-1" />
                    )}
                    Level {selectedSkill.level}
                  </Badge>
                  <Badge variant="outline">{selectedSkill.category}</Badge>
                </div>

                {selectedSkill.prerequisites.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Prerequisites:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedSkill.prerequisites.map(prereqId => {
                        const prereq = skills.find(s => s.id === prereqId);
                        return (
                          <Badge
                            key={prereqId}
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => {
                              const prereqNode = nodes.find(
                                n => n.id === prereqId
                              );
                              if (prereqNode) setSelectedSkill(prereqNode);
                            }}
                          >
                            {prereq?.name || prereqId}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
