import { useState } from 'react'
import {
  Box,
  Typography,
  Button,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
} from '@mui/material'
import type { ClusterNode } from '@/types'

interface NodeSelectionStepProps {
  nodes: ClusterNode[]
  selectedNodes: string[]
  onNext: (selectedNodeIds: string[]) => void
  onBack: () => void
}

export function NodeSelectionStep({
  nodes,
  selectedNodes: initialSelectedNodes,
  onNext,
  onBack,
}: NodeSelectionStepProps) {
  const [selectedNodes, setSelectedNodes] = useState<string[]>(initialSelectedNodes)

  const handleToggleNode = (hostname: string) => {
    setSelectedNodes(prev =>
      prev.includes(hostname) ? prev.filter(h => h !== hostname) : [...prev, hostname]
    )
  }

  const handleSelectAll = () => {
    setSelectedNodes(nodes.map(n => n.hostname))
  }

  const handleSelectNone = () => {
    setSelectedNodes([])
  }

  const handleNext = () => {
    onNext(selectedNodes)
  }

  const allSelected = selectedNodes.length === nodes.length
  const noneSelected = selectedNodes.length === 0

  const getRoleColor = (role: ClusterNode['role']) => {
    switch (role) {
      case 'publisher':
        return 'primary'
      case 'subscriber':
        return 'info'
      case 'tftp':
        return 'warning'
      case 'cups':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status: ClusterNode['status']) => {
    switch (status) {
      case 'online':
        return 'success'
      case 'offline':
        return 'error'
      default:
        return 'default'
    }
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select Cluster Nodes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose which nodes to collect logs from. All nodes are selected by default.
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={handleSelectAll}
          disabled={allSelected}
        >
          Select All
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={handleSelectNone}
          disabled={noneSelected}
        >
          Select None
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto', alignSelf: 'center' }}>
          {selectedNodes.length} of {nodes.length} selected
        </Typography>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedNodes.length > 0 && selectedNodes.length < nodes.length}
                  onChange={() => (allSelected ? handleSelectNone() : handleSelectAll())}
                />
              </TableCell>
              <TableCell>Hostname</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {nodes.map(node => (
              <TableRow
                key={node.hostname}
                hover
                onClick={() => handleToggleNode(node.hostname)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedNodes.includes(node.hostname)} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {node.hostname}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {node.ipAddress}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={node.role} color={getRoleColor(node.role)} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {node.version || 'Unknown'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={node.status} color={getStatusColor(node.status)} size="small" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button onClick={onBack}>Back</Button>
        <Button variant="contained" onClick={handleNext} disabled={noneSelected}>
          Next
        </Button>
      </Box>
    </Box>
  )
}
